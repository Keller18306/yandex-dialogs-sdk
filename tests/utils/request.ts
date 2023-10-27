import { IApiRequest } from '../../src/api/request';

export function createTextRequest(
    commandText: string,
    utteranceText?: string,
): IApiRequest {
  return {
    meta: {
      client_id: 'Developer Console',
      locale: 'ru-RU',
      timezone: 'UTC',
    },
    request: {
      command: commandText,
      original_utterance: utteranceText || commandText,
      type: 'SimpleUtterance',
    },
    session: {
      message_id: 0,
      new: true,
      session_id: '6d0d2a2e-f14149b9-33febdb2-8037',
      skill_id: '123',
      user: {
        user_id: '6C91DA5198D1758C6A9F63A7C5CDDF09359F683B13A18A151FBF4C8B092BB0C2',
        access_token: 'AgAAAAAB4vpbAAApoR1oaCd5yR6eiXSHqOGT8dT',
      },
      application: {
        application_id: '47C73714B580ED2469056E71081159529FFC676A4E5B059D629A819E857DC2F8',
      },
      user_id: '12312123',
    },
    version: '1.0',
  };
}
