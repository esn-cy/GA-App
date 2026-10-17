import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportVotersStandaloneComponent } from '@tabs/voting/voters/importVoters.component';
import { VotingSession } from '@models/votingSession.model';
import * as xlsx from 'xlsx';

describe('ImportVotersStandaloneComponent', () => {
  let component: ImportVotersStandaloneComponent;
  let mockModalCtrl: any;
  let mockMessage: any;
  let mockTranslations: any;
  let mockVoting: any;
  let mockApp: any;

  beforeEach(() => {
    mockModalCtrl = {
      dismiss: vi.fn().mockResolvedValue(true)
    };
    mockMessage = {
      warning: vi.fn().mockResolvedValue(undefined),
      error: vi.fn().mockResolvedValue(undefined)
    };
    mockTranslations = {
      _: vi.fn().mockReturnValue('Import Voters')
    };
    mockVoting = {
      getActiveList: vi.fn().mockResolvedValue([
        new VotingSession({ sessionId: 's-1', name: 'Current' }),
        new VotingSession({
          sessionId: 's-2',
          name: 'Other',
          voters: [{ id: 'v-1', name: 'Voter 1' }]
        })
      ]),
      downloadVotersSpreadsheet: vi.fn()
    };
    mockApp = {};

    component = new ImportVotersStandaloneComponent(
      mockModalCtrl,
      mockMessage,
      mockTranslations,
      mockVoting,
      mockApp
    );
    component.votingSession = new VotingSession({ sessionId: 's-1' });
  });

  it('should load other active sessions on ngOnInit', async () => {
    await component.ngOnInit();
    expect(mockVoting.getActiveList).toHaveBeenCalled();
    expect(component.otherVotingSessions.length).toBe(1);
    expect(component.otherVotingSessions[0].sessionId).toBe('s-2');
  });

  it('should handle null getActiveList on ngOnInit', async () => {
    mockVoting.getActiveList.mockResolvedValueOnce(null);
    await component.ngOnInit();
    expect(component.otherVotingSessions).toEqual([]);
  });

  it('should download template file', () => {
    component.downloadTemplate();
    expect(mockVoting.downloadVotersSpreadsheet).toHaveBeenCalledWith(
      'Import Voters.xlsx',
      expect.any(VotingSession)
    );
  });

  it('should import voters from other session', async () => {
    await component.ngOnInit();
    component.votingSessionToCopy = component.otherVotingSessions[0];

    component.importFromOtherSession();
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ id: 'v-1' })
    ]));

    component.votingSessionToCopy = undefined;
    component.importFromOtherSession();
  });

  it('should dismiss on close()', () => {
    component.close();
    expect(mockModalCtrl.dismiss).toHaveBeenCalled();
  });

  it('should handle import with no file', async () => {
    await component.import({ target: { files: null } as any });
    expect(mockModalCtrl.dismiss).not.toHaveBeenCalled();
  });

  it('should reset file input element if present', () => {
    const input = document.createElement('input');
    input.id = 'filePicker';
    input.value = 'test.xlsx';
    document.body.appendChild(input);

    component.resetFileToUpload();
    expect(input.value).toBe('');
    document.body.removeChild(input);
  });

  it('should import voters from valid spreadsheet file', async () => {
    const file = new File(['dummy'], 'voters.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const input = { files: [file] } as any;

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([
      { 'Voter Identifier': 'v-10', Name: 'Valid Voter', Email: 'valid@example.com', 'Vote Weight': 1 }
    ]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const binary = xlsx.write(wb, { type: 'binary', bookType: 'xlsx' });

    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: any;
      onerror: any;

      readAsArrayBuffer() {
        this.onload({ target: { result: binary } });
      }
    }

    globalThis.FileReader = MockFileReader as any;

    await component.import({ target: input });
    expect(mockModalCtrl.dismiss).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'v-10', name: 'Valid Voter' })])
    );

    globalThis.FileReader = originalFileReader;
  });

  it('should warn when imported rows have validation errors', async () => {
    const file = new File(['dummy'], 'voters.xlsx');
    const input = { files: [file] } as any;

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet([
      { 'Voter Identifier': '', Name: '', Email: 'invalid-email' }
    ]);
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1');
    const binary = xlsx.write(wb, { type: 'binary', bookType: 'xlsx' });

    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onload: any;
      onerror: any;

      readAsArrayBuffer() {
        this.onload({ target: { result: binary } });
      }
    }

    globalThis.FileReader = MockFileReader as any;

    await component.import({ target: input });
    expect(mockMessage.warning).toHaveBeenCalledWith('VOTING.SOME_ROWS_HAVE_ERRORS');
    expect(component.indexesOfRowsWithErr.length).toBeGreaterThan(0);

    // FileReader onerror
    class ErrorFileReader {
      onload: any;
      onerror: any;

      readAsArrayBuffer() {
        this.onerror();
      }
    }

    globalThis.FileReader = ErrorFileReader as any;
    await component.import({ target: input });
    expect(mockMessage.error).toHaveBeenCalledWith('COMMON.OPERATION_FAILED');

    globalThis.FileReader = originalFileReader;
  });
});
