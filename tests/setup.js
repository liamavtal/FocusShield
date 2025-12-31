// Mock Chrome APIs
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve())
    },
    local: {
      get: jest.fn((keys) => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  },
  declarativeNetRequest: {
    updateDynamicRules: jest.fn(() => Promise.resolve()),
    getDynamicRules: jest.fn(() => Promise.resolve([]))
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: { addListener: jest.fn() }
  },
  tabs: {
    update: jest.fn()
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://test/${path}`)
  }
};

global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ valid: false })
  })
);
