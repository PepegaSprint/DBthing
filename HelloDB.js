import { createWriteStream } from 'node:fs';
import fs from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util';
import fetch from 'node-fetch';
import iconv from 'iconv-lite';
import AdmZip from "adm-zip";
import xmljs from 'xml-js';


async function CookedBICData() {

  const streamPipeline = promisify(pipeline);
  let fileName = "";

  const response = await fetch('http://www.cbr.ru/s/newbik');
  if (!response.ok) {
    throw new Error(`unexpected response ${response.statusText}`);
  }
  await streamPipeline(response.body, createWriteStream('./BicDB.zip'));

  let zip = new AdmZip('./BicDB.zip')
  zip.extractAllTo('./BicDBfile/')


  fs.readdirSync('./BicDBfile/').forEach(file => {
    fileName = file;
  });





  let unEncodedData = fs.readFileSync(`./BicDBfile/` + fileName);
  let decodedData = iconv.decode(unEncodedData, 'win1251');
  let encodedData = iconv.encode(decodedData, 'utf8');

  let result1 = xmljs.xml2json(encodedData, { compact: true, spaces: 4 });

  let bicData = JSON.parse(result1);

  let bicsNamesAccounts = new Array();
  for (let i = 0; i < bicData.ED807.BICDirectoryEntry.length; i++) {
    if (bicData.ED807.BICDirectoryEntry[i].Accounts == null) {
    } else if (bicData.ED807.BICDirectoryEntry[i].Accounts.length == 1) {
      bicsNamesAccounts.push({
        bic: bicData.ED807.BICDirectoryEntry[i]._attributes.BIC,
        name: bicData.ED807.BICDirectoryEntry[i].ParticipantInfo._attributes.NameP,
        corrAcc: bicData.ED807.BICDirectoryEntry[i].Accounts[0]._attributes.Account
      })
    } else {
      for (let j = 0; j < bicData.ED807.BICDirectoryEntry[i].Accounts.length; j++) {
        bicsNamesAccounts.push({
          bic: bicData.ED807.BICDirectoryEntry[i]._attributes.BIC,
          name: bicData.ED807.BICDirectoryEntry[i].ParticipantInfo._attributes.NameP,
          corrAcc: bicData.ED807.BICDirectoryEntry[i].Accounts[j]._attributes.Account
        });
      }
    }
  }
  fs.unlinkSync('./BicDB.zip');
  fs.unlinkSync(`./BicDBfile/` + fileName);
  return (bicsNamesAccounts);
}

CookedBICData();