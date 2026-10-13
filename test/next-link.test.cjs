const assert = require('node:assert/strict');
const test = require('node:test');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const Link = require('next/link').default;

test('Next.js Link renders an anchor with its route and label', () => {
  const html = renderToStaticMarkup(
    React.createElement(Link, {href: '/dashboard'}, 'Seller dashboard'),
  );

  assert.match(html, /href="\/dashboard"/);
  assert.match(html, /Seller dashboard/);
});
