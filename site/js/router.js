/**
 * Hash-based router per url-routing.md contract.
 * Routes: #/ (overview), #/city/{id} (detail), #/city/{id}/history (history)
 * Query params: showBots=true|false
 */

const routes = [];
let notFoundHandler = null;

export function addRoute(pattern, handler) {
  routes.push({ pattern, handler });
}

export function setNotFound(handler) {
  notFoundHandler = handler;
}

export function parseHash() {
  const raw = window.location.hash || '#/';
  const [pathPart, queryPart] = raw.slice(1).split('?');
  const path = pathPart || '/';
  const params = new URLSearchParams(queryPart || '');
  return { path, params };
}

export function navigate(path, params) {
  let hash = '#' + path;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    if (qs) hash += '?' + qs;
  }
  window.location.hash = hash;
}

export function getQueryParam(name) {
  const { params } = parseHash();
  return params.get(name);
}

export function setQueryParam(name, value) {
  const { path, params } = parseHash();
  if (value === null || value === undefined || value === 'false') {
    params.delete(name);
  } else {
    params.set(name, value);
  }
  navigate(path, Object.fromEntries(params));
}

function matchRoute(path) {
  for (const route of routes) {
    const match = matchPattern(route.pattern, path);
    if (match !== null) {
      return { handler: route.handler, params: match };
    }
  }
  return null;
}

function matchPattern(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

export function handleRoute() {
  const { path, params: queryParams } = parseHash();
  const result = matchRoute(path);

  if (result) {
    result.handler(result.params, queryParams);
  } else if (notFoundHandler) {
    notFoundHandler();
  } else {
    // Fallback to overview
    navigate('/');
  }
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
