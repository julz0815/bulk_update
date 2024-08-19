import sjcl from 'sjcl';
import * as crypto from 'crypto';
import fs from 'fs';
import ini from 'ini';
import chalk from 'chalk'

interface AuthorizationHeaderParams {
  id: string;
  key: string;
  host: string;
  url: string;
  method: string;
}

interface RequestParameters {
  apiUrl: string;
  cleanedID: string;
  cleanedKEY: string;
}

const authorizationScheme = 'VERACODE-HMAC-SHA-256';
const requestVersion = 'vcode_request_version_1';
const nonceSize = 16;

function computeHashHex(message: string, key_hex: string): string {
  const key_bits = sjcl.codec.hex.toBits(key_hex);
  const hmac_bits = new sjcl.misc.hmac(key_bits, sjcl.hash.sha256).mac(message);
  const hmac = sjcl.codec.hex.fromBits(hmac_bits);
  return hmac;
}

function calulateDataSignature(apiKeyBytes: string, nonceBytes: string, dateStamp: string, data: string): string {
  const kNonce = computeHashHex(nonceBytes, apiKeyBytes);
  const kDate = computeHashHex(dateStamp, kNonce);
  const kSig = computeHashHex(requestVersion, kDate);
  const kFinal = computeHashHex(data, kSig);
  return kFinal;
}

function newNonce(): string {
  return crypto.randomBytes(nonceSize).toString('hex').toUpperCase();
}

function toHexBinary(input: string): string {
  return sjcl.codec.hex.fromBits(sjcl.codec.utf8String.toBits(input));
}

export async function calculateAuthorizationHeader(params: AuthorizationHeaderParams): Promise<string> {
  const uriString = params.url;
  const data = `id=${params.id}&host=${params.host}&url=${uriString}&method=${params.method}`;
  const dateStamp = Date.now().toString();
  const nonceBytes = newNonce();
  const dataSignature = calulateDataSignature(params.key, nonceBytes, dateStamp, data);
  const authorizationParam = `id=${params.id},ts=${dateStamp},nonce=${toHexBinary(nonceBytes)},sig=${dataSignature}`;
  const header = authorizationScheme + ' ' + authorizationParam;
  return header;
}


export async function selectPlatform(credentialsfile:any){
  
  const fileContent = fs.readFileSync(credentialsfile, 'utf-8');
  const creds = ini.parse(fileContent);
  const veracodeApiKeyId = creds.default.veracode_api_key_id;
  const veracodeApiKeySecret = creds.default.veracode_api_key_secret;
  

  let requestParameters:RequestParameters

  if ( veracodeApiKeyId.startsWith('vera01ei-') ){
      requestParameters = {
          apiUrl : 'api.veracode.eu',
          cleanedID : veracodeApiKeyId?.replace('vera01ei-','') ?? '',
          cleanedKEY : veracodeApiKeySecret?.replace('vera01es-','') ?? ''
      }
      console.log(chalk.green('Region: EU'))
  }
  else {
      requestParameters = {
          apiUrl : 'api.veracode.com',
          cleanedID : veracodeApiKeyId,
          cleanedKEY : veracodeApiKeySecret
      }
      console.log(chalk.green('Region: US'))
  }
  return requestParameters
}




