import gitUrlParse from 'git-url-parse';
import { logger } from '../../logger';
import { detectPlatform } from '../common';
import * as hostRules from '../host-rules';
import { regEx } from '../regex';

export function parseGitUrl(url: string): gitUrlParse.GitUrl {
  return gitUrlParse(url);
}

export function getHttpUrl(url: string, token?: string): string {
  const parsedUrl = parseGitUrl(url);

  parsedUrl.token = token ?? '';

  if (token) {
    switch (detectPlatform(url)) {
      case 'gitlab':
        parsedUrl.token = token.includes(':')
          ? token
          : `gitlab-ci-token:${token}`;
    }
  }

  const protocol = regEx(/^https?$/).exec(parsedUrl.protocol)
    ? parsedUrl.protocol
    : 'https';
  return parsedUrl.toString(protocol);
}

export function getRemoteUrlWithToken(url: string, hostType?: string): string {
  const httpUrl = getHttpUrl(url)
  const hostRule = hostRules.find({ url: httpUrl, hostType });

  if (hostRule?.token) {
    logger.debug(`Found hostRules token for url ${url}`);
    const colonIndex = hostRule.token.indexOf(":")
    let encodedToken
    
    if (colonIndex > -1) {
      const encodedUsername = encodeURIComponent(hostRule.token.substring(0, colonIndex));
      const encodedPassword = encodeURIComponent(hostRule.token.substring(colonIndex + 1));
      encodedToken = `${encodedUsername}:${encodedPassword}`
    } else {
      encodedToken = encodeURIComponent(hostRule.token)
    }
    
    return getHttpUrl(url, encodedToken);
  }

  if (hostRule?.username && hostRule?.password) {
    logger.debug(`Found hostRules username and password for url ${url}`);
    const encodedUsername = encodeURIComponent(hostRule.username);
    const encodedPassword = encodeURIComponent(hostRule.password);

    return getHttpUrl(url, `${encodedUsername}:${encodedPassword}`);
  }

  return url;
}
