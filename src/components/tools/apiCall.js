'use strict';

const axios = require('axios');

/**
 * Make an arbitrary raw HTTP/API request using Axios.
 * Supports GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS with custom headers, query params, body data, and timeout.
 *
 * @param {object} params
 * @param {string} params.url - Absolute URL to send request to
 * @param {string} [params.method='GET'] - HTTP method (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
 * @param {object|string} [params.headers] - Custom request headers
 * @param {object|string} [params.params] - URL query parameters
 * @param {any} [params.data] - Request body / payload (object, array, string, number)
 * @param {any} [params.body] - Alias for data
 * @param {number} [params.timeout=15000] - Request timeout in milliseconds (default 15000)
 * @param {number} [params.maxContentLength] - Max response body size in bytes (default 5MB)
 * @returns {Promise<object>} Response details including status, statusText, headers, and data
 */
async function callApi(params = {}) {
  let { url, method = 'GET', headers = {}, params: queryParams, data, body, timeout = 15000 } = params;

  if (!url || typeof url !== 'string' || !url.trim()) {
    throw Object.assign(new Error('`url` is required for api_call.'), { status: 400 });
  }

  url = url.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  method = (method || 'GET').toUpperCase();

  // Support body alias
  let requestData = data !== undefined ? data : body;
  if (typeof requestData === 'string') {
    try {
      requestData = JSON.parse(requestData);
    } catch {}
  }

  let requestHeaders = headers;
  if (typeof requestHeaders === 'string') {
    try {
      requestHeaders = JSON.parse(requestHeaders);
    } catch {
      requestHeaders = {};
    }
  }
  if (!requestHeaders || typeof requestHeaders !== 'object') {
    requestHeaders = {};
  }

  let requestParams = queryParams;
  if (typeof requestParams === 'string') {
    try {
      requestParams = JSON.parse(requestParams);
    } catch {
      requestParams = {};
    }
  }

  const startTime = Date.now();
  try {
    const res = await axios({
      url,
      method,
      headers: {
        'User-Agent': 'Marnie-AI-Assistant/1.0',
        ...requestHeaders,
      },
      params: requestParams,
      data: requestData,
      timeout: Math.min(60000, Math.max(1000, Number(timeout) || 15000)),
      maxContentLength: 5 * 1024 * 1024,
      validateStatus: () => true, // Don't throw on 4xx/5xx so LLM sees full error response body
      transformResponse: [(data) => {
        try {
          return JSON.parse(data);
        } catch {
          return data;
        }
      }],
    });

    const durationMs = Date.now() - startTime;

    return {
      success: res.status >= 200 && res.status < 400,
      status: res.status,
      statusText: res.statusText,
      durationMs,
      headers: res.headers,
      data: res.data,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      status: err.response?.status || null,
      statusText: err.response?.statusText || null,
      error: err.message,
      durationMs,
      headers: err.response?.headers || null,
      data: err.response?.data || null,
    };
  }
}

module.exports = {
  callApi,
  apiCall: callApi,
};
