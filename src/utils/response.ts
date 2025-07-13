/**
 * API Response Utilities
 * 
 * Common utilities for creating standardized API Gateway responses
 * with proper CORS headers and error handling.
 */

import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Standard CORS headers for API responses
 */
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

/**
 * Creates a successful API response
 */
export function createSuccessResponse<T>(data: T, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(data)
  };
}

/**
 * Creates an error API response
 */
export function createErrorResponse(
  message: string, 
  statusCode: number = 500,
  errorCode?: string
): APIGatewayProxyResult {
  const errorBody = {
    error: message,
    ...(errorCode && { code: errorCode })
  };

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(errorBody)
  };
}

/**
 * Creates a CORS preflight response
 */
export function createCorsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: JSON.stringify({ message: 'CORS preflight successful' })
  };
}

/**
 * Parses and validates JSON request body
 */
export function parseRequestBody<T>(body: string | null): T {
  if (!body) {
    throw new Error('Request body is required');
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Extracts and validates path parameters
 */
export function getPathParameter(
  pathParameters: { [name: string]: string } | null,
  paramName: string,
  required: boolean = true
): string | undefined {
  const value = pathParameters?.[paramName];
  
  if (required && !value) {
    throw new Error(`Path parameter '${paramName}' is required`);
  }
  
  return value;
}

/**
 * Extracts and validates query parameters
 */
export function getQueryParameter(
  queryStringParameters: { [name: string]: string } | null,
  paramName: string,
  defaultValue?: string
): string | undefined {
  return queryStringParameters?.[paramName] || defaultValue;
}

/**
 * Converts string to number with validation
 */
export function parseNumberParameter(
  value: string | undefined,
  paramName: string,
  min?: number,
  max?: number
): number {
  if (!value) {
    throw new Error(`Parameter '${paramName}' is required`);
  }

  const numValue = parseInt(value, 10);
  
  if (isNaN(numValue)) {
    throw new Error(`Parameter '${paramName}' must be a valid number`);
  }

  if (min !== undefined && numValue < min) {
    throw new Error(`Parameter '${paramName}' must be at least ${min}`);
  }

  if (max !== undefined && numValue > max) {
    throw new Error(`Parameter '${paramName}' must be at most ${max}`);
  }

  return numValue;
}
