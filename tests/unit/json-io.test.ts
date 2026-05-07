import * as fs from 'fs';
import { writeJsonFile } from '../../src/utils/json-io';

jest.mock('fs');
const mockedWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;

describe('writeJsonFile', () => {
  beforeEach(() => {
    mockedWriteFileSync.mockReset();
  });

  it('writes 2-space-indented JSON to the given path', () => {
    const data = { a: 1, b: 'hello', c: [1, 2, 3] };
    writeJsonFile('/tmp/out.json', data);

    expect(mockedWriteFileSync).toHaveBeenCalledTimes(1);
    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      '/tmp/out.json',
      JSON.stringify(data, null, 2)
    );
  });

  it('matches the formatting previously hand-written at call sites', () => {
    const data = { events: [{ id: 'e1' }] };
    writeJsonFile('/data/history.json', data);

    const written = mockedWriteFileSync.mock.calls[0][1] as string;
    expect(written).toBe(JSON.stringify(data, null, 2));
    // Concrete shape check so a future change to indent/newline tripsthe test
    expect(written).toBe(
      `{\n  "events": [\n    {\n      "id": "e1"\n    }\n  ]\n}`
    );
  });

  it('handles nested objects and null values', () => {
    const data = { outer: { inner: null, arr: [{ x: 1 }] } };
    writeJsonFile('/tmp/nested.json', data);

    expect(mockedWriteFileSync).toHaveBeenCalledWith(
      '/tmp/nested.json',
      JSON.stringify(data, null, 2)
    );
  });
});
