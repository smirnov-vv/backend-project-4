import fs from 'fs';
import nock from 'nock';
import os from 'os';
import path from 'path';
import pageloader from '../src/index.js';

const { promises: fsp } = fs;

let tempPath;
const url1 = 'https://ru.hexlet.io/courses';
const url2 = 'https://ru.hexlet.io';
const expectedData = '<html><head></head><body><center><b>hello</b></center></body></html>';
const fileName = 'ru-hexlet-io-courses.html';

beforeEach(async () => {
  tempPath = await fsp.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('return full path', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200);
  const fullPath = await pageloader(url1, tempPath);
  const src = path.join(tempPath, fileName);
  expect(fullPath).toEqual(src);
});

test('download page', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\/courses/)
    .reply(200, expectedData);
  await pageloader(url1, tempPath);
  const src = path.join(tempPath, fileName);
  const content = await fsp.readFile(src, { encoding: 'utf8' });
  expect(content).toEqual(expectedData);
});

test('non-existent directory', async () => {
  nock(/ru\.hexlet\.io/)
    .get(/\//)
    .reply(200);
  const wrongPath = path.join(tempPath, 'smth-non-existent');
  await expect(pageloader(url2, wrongPath)).rejects.toThrow(Error);
});
