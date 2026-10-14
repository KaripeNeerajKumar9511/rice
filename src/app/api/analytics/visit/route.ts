import {createHmac, randomUUID, timingSafeEqual} from 'node:crypto';
import {NextResponse, type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';

export const runtime = 'nodejs';

const COOKIE_NAME = 'dhanyam_visitor';
const TOKEN_PATTERN = /^[0-9a-f-]{36}$/;

function getAnalyticsConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cookieSecret = process.env.ANALYTICS_COOKIE_SECRET;
  if (!supabaseUrl || !serviceRoleKey || !cookieSecret || cookieSecret.length < 32) return null;
  return {supabaseUrl, serviceRoleKey, cookieSecret};
}

function signVisitorId(visitorId: string, secret: string) {
  return createHmac('sha256', secret).update(`cookie:${visitorId}`).digest('base64url');
}

function verifyVisitorCookie(value: string | undefined, secret: string) {
  if (!value) return null;
  const [visitorId, signature, extra] = value.split('.');
  if (extra || !visitorId || !signature || !TOKEN_PATTERN.test(visitorId)) return null;

  const expected = Buffer.from(signVisitorId(visitorId, secret));
  const received = Buffer.from(signature);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  return visitorId;
}

function setVisitorCookie(response: NextResponse, request: NextRequest, visitorId: string, secret: string) {
  response.cookies.set(COOKIE_NAME, `${visitorId}.${signVisitorId(visitorId, secret)}`, {
    httpOnly: true,
    secure: request.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365
  });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }
  const config = getAnalyticsConfig();
  if (!config) {
    return new NextResponse(null, {
      status: 204,
      headers: {'Cache-Control': 'no-store', 'X-Visitor-Analytics': 'disabled'}
    });
  }

  const visitorId = verifyVisitorCookie(request.cookies.get(COOKIE_NAME)?.value, config.cookieSecret);
  if (visitorId) return new NextResponse(null, {status: 204, headers: {'Cache-Control': 'no-store'}});

  const response = new NextResponse(null, {status: 204, headers: {'Cache-Control': 'no-store'}});
  setVisitorCookie(response, request, randomUUID(), config.cookieSecret);
  return response;
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) {
    return NextResponse.json({error: 'Invalid request origin'}, {status: 403});
  }

  const config = getAnalyticsConfig();
  if (!config) {
    return NextResponse.json({error: 'Visitor analytics is not configured'}, {status: 503});
  }

  const previousVisitorId = verifyVisitorCookie(request.cookies.get(COOKIE_NAME)?.value, config.cookieSecret);
  if (!previousVisitorId) {
    return NextResponse.json({error: 'A valid visitor cookie is required'}, {status: 400});
  }
  const visitorHash = createHmac('sha256', config.cookieSecret)
    .update(`visitor:${previousVisitorId}`)
    .digest('hex');
  const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {autoRefreshToken: false, persistSession: false}
  });
  const {error} = await supabase.rpc('record_visitor_visit', {p_visitor_hash: visitorHash});
  if (error) {
    return NextResponse.json({error: 'Visitor analytics could not be recorded'}, {status: 503});
  }

  const response = new NextResponse(null, {status: 204});
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
