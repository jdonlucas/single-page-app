import Acl from 'acl';
import axios from 'axios';
import decode from 'jwt-decode';

import aclRules from '@/build/acl-rules.preval';
import appRoutes from '@/build/routes.preval';

import { LOGIN_URL } from '@/config/globals';
import {
  AuthError,
  AuthResponse,
  AuthToken,
  User,
  AUTH_TOKEN_NOT_FOUND,
  AuthPermissions,
  AUTH_PERMISSIONS_NOT_FOUND,
} from '@/types/auth';

import { localStorage } from '@/utils/storage';

/**
 * Authenticate as user using the GraphQL server API.
 * @param email user email
 * @param password user password
 */
export async function authenticateFromRemote(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await axios({
    url: LOGIN_URL,
    data: { email, password },
    method: 'POST',
  });

  let user: User | undefined;
  let error: AuthError | undefined;

  try {
    const token = response.data.token as string | undefined;

    if (!token) {
      throw new AuthError(
        AUTH_TOKEN_NOT_FOUND,
        'Token not returned from the server'
      );
    }

    const decodedToken = decode(token) as AuthToken;
    const permissions = await getUserPermissions(
      decodedToken.email,
      decodedToken.roles
    );

    user = createUser(token, decodedToken, permissions);

    localStorage.setItem('token', token);
    localStorage.setItem('permissions', JSON.stringify(permissions));
  } catch (tokenError) {
    error = tokenError;
  }

  return {
    user,
    error,
  };
}

/**
 * Attempt to decode a local auth JWT.
 */
export function authenticateFromToken(): AuthResponse {
  let user: User | undefined = undefined;
  let error: AuthError | undefined = undefined;

  const token = localStorage.getItem('token');
  try {
    if (!token) throw new AuthError(AUTH_TOKEN_NOT_FOUND, 'Token not found');
    const decodedToken = decode(token) as AuthToken;

    const permissions = localStorage.getItem('permissions');
    if (!permissions)
      throw new AuthError(AUTH_PERMISSIONS_NOT_FOUND, 'Permissions not found');

    user = createUser(token, decodedToken, JSON.parse(permissions));
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('permissions');
    error = err;
  }

  return {
    user,
    error,
  };
}

/**
 * Creates a User object from a decoded token.
 * @param token encoded JWT from the remote or local storage
 * @param decodedToken decoded JWT
 * @param permissions computed ACL permissions
 *
 * Note: the decoded token and permissions are required as arguments because
 * of the way we generate permissions.
 *
 * To maintain compatibility with the `acl-rules` JSON file generated by the
 * graphql server, we use the same `acl` package, which initializes a virtual
 * Acl backend (in-memory database) in the browser.
 *
 * We then need to query this virtual backend asynchronously, but when loading
 * the auth store (redux, initial slice), we want to do it synchronously. The
 * only option in this case is to store permissions in localStorage (along with
 * the token) and pass them to a synchronous `createUser` function.
 *
 * A (preferable) alternative is be to initialize the user with no permissions,
 * then use an async `thunk` to update the store on log-in. This is in the TODO
 * list.
 */
export function createUser(
  token: string,
  decodedToken: AuthToken,
  permissions: AuthPermissions
): User {
  return {
    permissions,
    token,
    ...decodedToken,
  };
}

export async function getUserPermissions(
  user: string,
  roles: string[]
): Promise<AuthPermissions> {
  const acl = new Acl(new Acl.memoryBackend());

  // Default or custom acl rules
  await acl.allow(aclRules);

  // Current user and its associated roles
  await acl.addUserRoles(user, roles);

  // Controlled resources for which permissions should be retrieved
  const resources = [...appRoutes.admin, ...appRoutes.models].map(
    ({ name }) => name
  ) as string[];

  // Parse and return the current user permissions
  return new Promise<AuthPermissions>((resolve, reject) => {
    acl.allowedPermissions(user, resources, (err, permissions) => {
      if (err) reject(err.message);
      resolve(permissions);
    });
  });
}
