import appConfig from '../../../ga-app.config.json';
import { STAGE } from './environment.stage';

const mediaDomain = appConfig.domains?.media ?? 'media.'.concat(appConfig.domain);
const apiDomain = appConfig.domains?.api ?? 'api.'.concat(appConfig.domain);
const webSocketApiDomain = appConfig.domains?.socket ?? 'socket.'.concat(appConfig.domain);

/**
 * Variables to configure an ITER IDEA's cloud app, together with its inner modules.
 */
export const environment = {
  idea: {
    app: { version: '1.11.4', mediaUrl: 'https://'.concat(mediaDomain), maxFileUploadSizeMB: 50 },
    api: { url: apiDomain, stage: STAGE },
    socket: { url: webSocketApiDomain, stage: STAGE },
    ionicExtraModules: ['common']
  }
};
