// Global test setup for Angular 20 and Vitest
import 'zone.js';
import 'zone.js/testing';
import { vi } from 'vitest';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: vi.fn().mockResolvedValue(undefined)
  }
}));

const testBed = getTestBed();
if (!testBed.platform) {
  testBed.initTestEnvironment(
    BrowserTestingModule,
    platformBrowserTesting(),
    { teardown: { destroyAfterEach: true } }
  );
}

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): any => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {
      },
      removeListener: () => {
      },
      addEventListener: () => {
      },
      removeEventListener: () => {
      },
      dispatchEvent: () => false
    });
  }

  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];

      disconnect() {
      }

      observe() {
      }

      takeRecords() {
        return [];
      }

      unobserve() {
      }
    } as any;
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      disconnect() {
      }

      observe() {
      }

      unobserve() {
      }
    } as any;
  }

  if (typeof globalThis.URL.createObjectURL === 'undefined') {
    (globalThis.URL as any).createObjectURL = () => 'blob:mock-url';
  }
  if (typeof globalThis.URL.revokeObjectURL === 'undefined') {
    (globalThis.URL as any).revokeObjectURL = () => {
    };
  }
  if (typeof window.URL.createObjectURL === 'undefined') {
    window.URL.createObjectURL = (globalThis.URL as any).createObjectURL;
  }
  if (typeof window.URL.revokeObjectURL === 'undefined') {
    window.URL.revokeObjectURL = (globalThis.URL as any).revokeObjectURL;
  }
}
