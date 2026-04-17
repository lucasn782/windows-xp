import React, { useEffect, useEffectEvent, useRef, useState } from 'react';

const INITIAL_Z_INDEX = 10;
const DEFAULT_TASKBAR_HEIGHT = 40;
const TALL_TASKBAR_HEIGHT = 52;
const WINDOW_WIDTH = 600;
const WINDOW_HEIGHT = 400;
const MIN_WINDOW_WIDTH = 320;
const MIN_WINDOW_HEIGHT = 220;
const LOGIN_USERNAME = 'admin';
const LOGIN_PASSWORD = '12345';
const HAS_LOGGED_IN_KEY = 'xp_has_logged_in';
const USER_DOCUMENTS_KEY = 'xp_user_documents';
const RECYCLE_BIN_KEY = 'xp_recycle_bin';
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const withPublicUrl = (path) => `${PUBLIC_URL}${path}`;
const DEFAULT_BROWSER_HOME = 'https://www.google.com/webhp?igu=1';
const DEFAULT_SEARCH_URL = 'https://www.google.com/search?igu=1&q=';
const WINDOW_TRANSITION_MS = 240;
const START_MENU_TRANSITION_MS = 220;
const TAB_CLOSE_TRANSITION_MS = 180;

const SYSTEM_SOUNDS = {
  startup: withPublicUrl('/sounds/startup.mp3'),
  logon: withPublicUrl('/sounds/logon.mp3'),
  logoff: withPublicUrl('/sounds/logoff.mp3'),
  shutdown: withPublicUrl('/sounds/shutdown.mp3'),
};

const PROGRAMS = {
  NOTEPAD: 'Notepad',
  CALC: 'Calculator',
  IE: 'Internet Explorer',
  MY_COMPUTER: 'My Computer',
  CONTROL_PANEL: 'Control Panel',
  TRASH: 'Recycle Bin',
};

const ROOT_ITEMS = [
  { id: 'documents', name: 'Meus Documentos', type: 'folder', icon: '📁' },
];

const DOCUMENT_FILES = [
  { id: 'readme', name: 'Leia-me.txt', icon: '📄', path: withPublicUrl('/meus-documentos/Leia-me.txt') },
  { id: 'notes', name: 'Anotacoes.txt', icon: '📄', path: withPublicUrl('/meus-documentos/Anotacoes.txt') },
  { id: 'links', name: 'Links-Uteis.txt', icon: '📄', path: withPublicUrl('/meus-documentos/Links-Uteis.txt') },
];

const PROGRAM_ICONS = {
  [PROGRAMS.NOTEPAD]: '📝',
  [PROGRAMS.CALC]: '🧮',
  [PROGRAMS.IE]: '🌐',
  [PROGRAMS.MY_COMPUTER]: '💻',
  [PROGRAMS.TRASH]: '🗑️',
};

const WALLPAPERS = {
  bliss: 'url(https://wallpapercave.com/wp/wp1851030.jpg)',
  sky: 'linear-gradient(180deg, #5c96d7 0%, #4d85c4 45%, #386ea8 100%)',
  olive: 'linear-gradient(180deg, #7d9f54 0%, #6e8f48 55%, #506732 100%)',
};

const createWindowPosition = (index) => ({
  x: 90 + ((index % 6) * 28),
  y: 60 + ((index % 6) * 24),
});

function createWindowSize(type) {
  switch (type) {
    case PROGRAMS.NOTEPAD:
      return { width: 640, height: 460 };
    case PROGRAMS.MY_COMPUTER:
    case PROGRAMS.TRASH:
      return { width: 720, height: 460 };
    case PROGRAMS.IE:
      return { width: 760, height: 520 };
    case PROGRAMS.CALC:
      return { width: 330, height: 420 };
    default:
      return { width: WINDOW_WIDTH, height: WINDOW_HEIGHT };
  }
}

function getViewportBounds(taskbarHeight) {
  return {
    width: window.innerWidth,
    height: Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - taskbarHeight),
  };
}

function clampWindowBounds(bounds, taskbarHeight) {
  const viewport = getViewportBounds(taskbarHeight);
  const width = Math.min(Math.max(MIN_WINDOW_WIDTH, bounds.width), viewport.width);
  const height = Math.min(Math.max(MIN_WINDOW_HEIGHT, bounds.height), viewport.height);
  const maxX = Math.max(0, viewport.width - width);
  const maxY = Math.max(0, viewport.height - height);

  return {
    x: Math.min(Math.max(0, bounds.x), maxX),
    y: Math.min(Math.max(0, bounds.y), maxY),
    width,
    height,
  };
}

function getMaximizedBounds(taskbarHeight) {
  const viewport = getViewportBounds(taskbarHeight);
  return {
    x: 0,
    y: 0,
    width: viewport.width,
    height: viewport.height,
  };
}

function sanitizeFileName(name) {
  const trimmed = name.trim().replace(/[<>:"/\\|?*]+/g, '');
  if (!trimmed) return '';
  return trimmed.toLowerCase().endsWith('.txt') ? trimmed : `${trimmed}.txt`;
}

function loadStoredItems(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getSearchUrl(query) {
  return `${DEFAULT_SEARCH_URL}${encodeURIComponent(query)}`;
}

function looksLikeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;

  return (
    /^https?:\/\//i.test(trimmed)
    || /^localhost(?::\d+)?(\/.*)?$/i.test(trimmed)
    || /^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(trimmed)
  );
}

function normalizeBrowserDestination(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_BROWSER_HOME;
  }

  if (!looksLikeUrl(trimmed)) {
    return getSearchUrl(trimmed);
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return getSearchUrl(trimmed);
    }

    return parsed.toString();
  } catch (error) {
    return getSearchUrl(trimmed);
  }
}

function getBrowserTabTitle(url, index) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./i, '') || `Aba ${index + 1}`;
  } catch (error) {
    return `Aba ${index + 1}`;
  }
}

function createBrowserTab(url = DEFAULT_BROWSER_HOME, index = 0) {
  const normalizedUrl = normalizeBrowserDestination(url);

  return {
    id: Date.now() + Math.floor(Math.random() * 100000) + index,
    title: getBrowserTabTitle(normalizedUrl, index),
    addressInput: normalizedUrl,
    currentUrl: normalizedUrl,
    history: [normalizedUrl],
    historyIndex: 0,
  };
}

function evaluateExpression(expression) {
  const normalized = expression.replace(/\s+/g, '');

  if (!/^[\d.+\-*/]+$/.test(normalized)) {
    return 'Erro';
  }

  const tokens = normalized.match(/\d*\.?\d+|[+\-*/]/g);
  if (!tokens) return 'Erro';

  const values = [];
  const operators = [];
  const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };

  const applyOperation = () => {
    const operator = operators.pop();
    const right = values.pop();
    const left = values.pop();

    if (operator == null || left == null || right == null) {
      throw new Error('Invalid expression');
    }

    switch (operator) {
      case '+':
        values.push(left + right);
        break;
      case '-':
        values.push(left - right);
        break;
      case '*':
        values.push(left * right);
        break;
      case '/':
        values.push(right === 0 ? Number.NaN : left / right);
        break;
      default:
        throw new Error('Unsupported operator');
    }
  };

  for (const token of tokens) {
    if (precedence[token]) {
      while (
        operators.length
        && precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        applyOperation();
      }
      operators.push(token);
    } else {
      values.push(Number(token));
    }
  }

  while (operators.length) {
    applyOperation();
  }

  if (values.length !== 1 || Number.isNaN(values[0]) || !Number.isFinite(values[0])) {
    return 'Erro';
  }

  return String(values[0]);
}

function Window({
  id,
  title,
  icon,
  children,
  onClose,
  onMinimize,
  onFocus,
  zIndex,
  active,
  initialPosition,
  initialSize,
  taskbarHeight,
  isMinimized,
  isClosing,
}) {
  const [bounds, setBounds] = useState(() => clampWindowBounds({
    x: initialPosition.x,
    y: initialPosition.y,
    width: initialSize.width,
    height: initialSize.height,
  }, taskbarHeight));
  const [isMaximized, setIsMaximized] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const restoreBoundsRef = useRef(bounds);
  const isInteracting = Boolean(dragRef.current || resizeRef.current);

  useEffect(() => {
    setBounds(clampWindowBounds({
      x: initialPosition.x,
      y: initialPosition.y,
      width: initialSize.width,
      height: initialSize.height,
    }, taskbarHeight));
    setIsMaximized(false);
  }, [initialPosition, initialSize, taskbarHeight]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (dragRef.current) {
        const nextBounds = clampWindowBounds({
          ...dragRef.current.startBounds,
          x: dragRef.current.startBounds.x + (e.clientX - dragRef.current.startX),
          y: dragRef.current.startBounds.y + (e.clientY - dragRef.current.startY),
        }, taskbarHeight);

        setBounds((prev) => ({ ...prev, x: nextBounds.x, y: nextBounds.y }));
        return;
      }

      if (!resizeRef.current) return;

      const { direction, startBounds, startX, startY } = resizeRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      let nextBounds = { ...startBounds };

      if (direction.includes('right')) {
        nextBounds.width = startBounds.width + deltaX;
      }
      if (direction.includes('bottom')) {
        nextBounds.height = startBounds.height + deltaY;
      }
      if (direction.includes('left')) {
        nextBounds.x = startBounds.x + deltaX;
        nextBounds.width = startBounds.width - deltaX;
      }
      if (direction.includes('top')) {
        nextBounds.y = startBounds.y + deltaY;
        nextBounds.height = startBounds.height - deltaY;
      }

      if (nextBounds.width < MIN_WINDOW_WIDTH) {
        if (direction.includes('left')) {
          nextBounds.x -= MIN_WINDOW_WIDTH - nextBounds.width;
        }
        nextBounds.width = MIN_WINDOW_WIDTH;
      }

      if (nextBounds.height < MIN_WINDOW_HEIGHT) {
        if (direction.includes('top')) {
          nextBounds.y -= MIN_WINDOW_HEIGHT - nextBounds.height;
        }
        nextBounds.height = MIN_WINDOW_HEIGHT;
      }

      setBounds(clampWindowBounds(nextBounds, taskbarHeight));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [taskbarHeight]);

  useEffect(() => {
    const handleResize = () => {
      setBounds((prev) => (
        isMaximized
          ? getMaximizedBounds(taskbarHeight)
          : clampWindowBounds(prev, taskbarHeight)
      ));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMaximized, taskbarHeight]);

  const beginDrag = (e) => {
    if (isMaximized) return;
    e.preventDefault();
    onFocus(id);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startBounds: bounds,
    };
  };

  const beginResize = (direction) => (e) => {
    if (isMaximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(id);
    resizeRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      startBounds: bounds,
    };
  };

  const toggleMaximize = (e) => {
    e.stopPropagation();
    if (isMaximized) {
      setBounds(clampWindowBounds(restoreBoundsRef.current, taskbarHeight));
      setIsMaximized(false);
      return;
    }

    restoreBoundsRef.current = bounds;
    setBounds(getMaximizedBounds(taskbarHeight));
    setIsMaximized(true);
  };

  const resizeHandles = [
    { direction: 'top', className: 'absolute top-0 left-2 right-2 h-1 cursor-ns-resize' },
    { direction: 'bottom', className: 'absolute bottom-0 left-2 right-2 h-1 cursor-ns-resize' },
    { direction: 'left', className: 'absolute left-0 top-2 bottom-2 w-1 cursor-ew-resize' },
    { direction: 'right', className: 'absolute right-0 top-2 bottom-2 w-1 cursor-ew-resize' },
    { direction: 'top-left', className: 'absolute top-0 left-0 w-3 h-3 cursor-nwse-resize' },
    { direction: 'top-right', className: 'absolute top-0 right-0 w-3 h-3 cursor-nesw-resize' },
    { direction: 'bottom-left', className: 'absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize' },
    { direction: 'bottom-right', className: 'absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize' },
  ];

  return (
    <div
      className={`absolute shadow-2xl border-2 border-[#0054E3] ${isMaximized ? '' : 'rounded-t-lg'} bg-[#ECE9D8] flex flex-col overflow-hidden ${active ? 'ring-1 ring-blue-400' : ''}`}
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        zIndex,
        opacity: isMinimized || isClosing ? 0 : 1,
        pointerEvents: isMinimized || isClosing ? 'none' : 'auto',
        transform: isMinimized
          ? 'translateY(28px) scale(0.88)'
          : isClosing
            ? 'scale(0.94)'
            : 'translateY(0) scale(1)',
        transformOrigin: 'center bottom',
        transition: isInteracting
          ? 'none'
          : `left ${WINDOW_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), top ${WINDOW_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), width ${WINDOW_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), height ${WINDOW_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${WINDOW_TRANSITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${Math.max(160, WINDOW_TRANSITION_MS - 20)}ms ease`,
      }}
      onMouseDown={() => onFocus(id)}
    >
      <div
        onMouseDown={beginDrag}
        onDoubleClick={toggleMaximize}
        className={`flex items-center justify-between p-1 select-none ${isMaximized ? 'cursor-default' : 'cursor-move'} ${active ? 'bg-gradient-to-r from-[#0058EE] to-[#378DFF]' : 'bg-gray-400'}`}
      >
        <div className="flex items-center gap-2 text-white font-bold text-sm px-2 min-w-0">
          <span>{icon}</span>
          <span className="drop-shadow-md truncate">{title}</span>
        </div>
        <div className="flex gap-1 pr-1">
          <button
            type="button"
            className="w-5 h-5 bg-[#0054E3] border border-white text-white flex items-center justify-center text-xs hover:bg-blue-400 font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            aria-label="Minimizar janela"
          >
            _
          </button>
          <button
            type="button"
            className="w-5 h-5 bg-[#0054E3] border border-white text-white flex items-center justify-center text-[10px] hover:bg-blue-400 font-bold"
            onClick={toggleMaximize}
            aria-label={isMaximized ? 'Restaurar janela' : 'Maximizar janela'}
          >
            {isMaximized ? '❐' : '□'}
          </button>
          <button
            type="button"
            className="w-5 h-5 bg-[#0054E3] border border-white text-white flex items-center justify-center text-xs hover:bg-blue-400 font-bold"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          >
            X
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white overflow-auto relative">
        {children}
      </div>
      {!isMaximized && resizeHandles.map((handle) => (
        <div
          key={handle.direction}
          className={handle.className}
          onMouseDown={beginResize(handle.direction)}
        />
      ))}
    </div>
  );
}

export default function WindowsXP() {
  const [screen, setScreen] = useState('boot');
  const [shutdownComplete, setShutdownComplete] = useState(false);
  const [windows, setWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isStartMenuMounted, setIsStartMenuMounted] = useState(false);
  const [isStartMenuVisible, setIsStartMenuVisible] = useState(false);
  const [time, setTime] = useState(new Date());
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [explorerView, setExplorerView] = useState('root');
  const [taskbarTall, setTaskbarTall] = useState(false);
  const [wallpaper, setWallpaper] = useState('bliss');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [controlMessage, setControlMessage] = useState('Use os botoes para ajustar o sistema.');
  const [userDocuments, setUserDocuments] = useState(() => loadStoredItems(USER_DOCUMENTS_KEY));
  const [recycleBinItems, setRecycleBinItems] = useState(() => loadStoredItems(RECYCLE_BIN_KEY));
  const [notepadState, setNotepadState] = useState({
    title: 'Sem titulo.txt',
    content: '',
    fileId: null,
    fileOrigin: 'draft',
    loading: false,
    statusMessage: 'Pronto',
  });
  const [browserState, setBrowserState] = useState(() => {
    const initialTab = createBrowserTab();
    return {
      activeTabId: initialTab.id,
      tabs: [initialTab],
    };
  });
  const nextZIndex = useRef(INITIAL_Z_INDEX);
  const soundCacheRef = useRef({});
  const hasLoggedInRef = useRef(localStorage.getItem(HAS_LOGGED_IN_KEY) === 'true');
  const closeWindowTimersRef = useRef({});
  const taskbarHeight = taskbarTall ? TALL_TASKBAR_HEIGHT : DEFAULT_TASKBAR_HEIGHT;

  const playSound = useEffectEvent((name) => {
    if (!soundEnabled) return;

    const src = SYSTEM_SOUNDS[name];
    if (!src) return;

    if (!soundCacheRef.current[name]) {
      soundCacheRef.current[name] = new Audio(src);
    }

    const audio = soundCacheRef.current[name];
    audio.pause();
    audio.currentTime = 0;
    audio.play().catch(() => {});
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(USER_DOCUMENTS_KEY, JSON.stringify(userDocuments));
  }, [userDocuments]);

  useEffect(() => {
    localStorage.setItem(RECYCLE_BIN_KEY, JSON.stringify(recycleBinItems));
  }, [recycleBinItems]);

  useEffect(() => {
    if (screen !== 'boot') return undefined;

    const bootTimer = setTimeout(() => setScreen('login'), 2500);
    return () => clearTimeout(bootTimer);
  }, [screen]);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (screen !== 'welcome') return undefined;

    const soundName = hasLoggedInRef.current ? 'logon' : 'startup';
    playSound(soundName);

    if (!hasLoggedInRef.current) {
      hasLoggedInRef.current = true;
      localStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
    }

    const welcomeTimer = setTimeout(() => setScreen('desktop'), 2200);
    return () => clearTimeout(welcomeTimer);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'loggingOff') return undefined;

    playSound('logoff');
    const logoffTimer = setTimeout(() => setScreen('login'), 2100);
    return () => clearTimeout(logoffTimer);
  }, [screen]);

  useEffect(() => {
    if (screen !== 'shutdown') {
      setShutdownComplete(false);
      return undefined;
    }

    playSound('shutdown');
    const shutdownTimer = setTimeout(() => setShutdownComplete(true), 2600);
    return () => clearTimeout(shutdownTimer);
  }, [screen]);
  /* eslint-enable react-hooks/exhaustive-deps */

  useEffect(() => {
    if (!shutdownComplete) return undefined;

    const closeTimer = setTimeout(() => {
      window.open('', '_self');
      window.close();
    }, 1400);

    return () => clearTimeout(closeTimer);
  }, [shutdownComplete]);

  useEffect(() => {
    if (isStartOpen) {
      setIsStartMenuMounted(true);
      const frame = window.requestAnimationFrame(() => setIsStartMenuVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsStartMenuVisible(false);
    if (!isStartMenuMounted) {
      return undefined;
    }

    const timer = window.setTimeout(() => setIsStartMenuMounted(false), START_MENU_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isStartMenuMounted, isStartOpen]);

  useEffect(() => () => {
    Object.values(closeWindowTimersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const resetDesktopState = () => {
    Object.values(closeWindowTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    closeWindowTimersRef.current = {};
    const initialTab = createBrowserTab();
    setWindows([]);
    setActiveWindow(null);
    setIsStartOpen(false);
    setIsStartMenuMounted(false);
    setIsStartMenuVisible(false);
    setExplorerView('root');
    setControlMessage('Use os botoes para ajustar o sistema.');
    setNotepadState({
      title: 'Sem titulo.txt',
      content: '',
      fileId: null,
      fileOrigin: 'draft',
      loading: false,
      statusMessage: 'Pronto',
    });
    setBrowserState({
      activeTabId: initialTab.id,
      tabs: [initialTab],
    });
    nextZIndex.current = INITIAL_Z_INDEX;
  };

  const updateBrowserTab = (tabId, updater) => {
    setBrowserState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab, index) => (
        tab.id === tabId ? updater(tab, index) : tab
      )),
    }));
  };

  const activeBrowserTab = browserState.tabs.find((tab) => tab.id === browserState.activeTabId) || browserState.tabs[0];

  const setBrowserAddressInput = (tabId, value) => {
    updateBrowserTab(tabId, (tab) => ({ ...tab, addressInput: value }));
  };

  const navigateBrowserTab = (tabId, destination) => {
    const normalizedUrl = normalizeBrowserDestination(destination);

    setBrowserState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab, index) => {
        if (tab.id !== tabId) return tab;

        const nextHistory = tab.history.slice(0, tab.historyIndex + 1);
        nextHistory.push(normalizedUrl);

        return {
          ...tab,
          addressInput: normalizedUrl,
          currentUrl: normalizedUrl,
          history: nextHistory,
          historyIndex: nextHistory.length - 1,
          title: getBrowserTabTitle(normalizedUrl, index),
        };
      }),
    }));
  };

  const moveBrowserHistory = (tabId, direction) => {
    setBrowserState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((tab, index) => {
        if (tab.id !== tabId) return tab;

        const nextIndex = tab.historyIndex + direction;
        if (nextIndex < 0 || nextIndex >= tab.history.length) {
          return tab;
        }

        const nextUrl = tab.history[nextIndex];
        return {
          ...tab,
          historyIndex: nextIndex,
          currentUrl: nextUrl,
          addressInput: nextUrl,
          title: getBrowserTabTitle(nextUrl, index),
        };
      }),
    }));
  };

  const createNewBrowserTab = (destination = DEFAULT_BROWSER_HOME) => {
    setBrowserState((prev) => {
      const newTab = createBrowserTab(destination, prev.tabs.length);
      return {
        activeTabId: newTab.id,
        tabs: [...prev.tabs, newTab],
      };
    });
  };

  const closeBrowserTab = (tabId) => {
    setBrowserState((prev) => {
      if (prev.tabs.length === 1) {
        const replacementTab = createBrowserTab();
        return {
          activeTabId: replacementTab.id,
          tabs: [replacementTab],
        };
      }

      const closingIndex = prev.tabs.findIndex((tab) => tab.id === tabId);
      const nextTabs = prev.tabs.filter((tab) => tab.id !== tabId);
      const fallbackTab = nextTabs[Math.max(0, closingIndex - 1)] || nextTabs[0];

      return {
        activeTabId: prev.activeTabId === tabId ? fallbackTab.id : prev.activeTabId,
        tabs: nextTabs,
      };
    });
  };

  const openWindow = (type) => {
    const existingWindow = windows.find((win) => win.type === type);

    if (existingWindow) {
      if (existingWindow.isClosing) return;
      restoreWindow(existingWindow.id);
      return;
    }

    nextZIndex.current += 1;
    const newWindow = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type,
      zIndex: nextZIndex.current,
      initialPosition: createWindowPosition(windows.length),
      initialSize: createWindowSize(type),
      isMinimized: false,
      isClosing: false,
    };

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindow(newWindow.id);
    setIsStartOpen(false);
  };

  const closeWindow = (id) => {
    setWindows((prev) => prev.map((win) => (
      win.id === id ? { ...win, isClosing: true, isMinimized: false } : win
    )));
    setActiveWindow((prev) => (prev === id ? null : prev));
    if (closeWindowTimersRef.current[id]) {
      window.clearTimeout(closeWindowTimersRef.current[id]);
    }
    closeWindowTimersRef.current[id] = window.setTimeout(() => {
      setWindows((prev) => prev.filter((win) => win.id !== id));
      delete closeWindowTimersRef.current[id];
    }, WINDOW_TRANSITION_MS);
  };

  const handleFocus = (id) => {
    nextZIndex.current += 1;
    setActiveWindow(id);
    setWindows((prev) => prev.map((win) => (
      win.id === id ? {
        ...win,
        zIndex: nextZIndex.current,
        isMinimized: false,
        isClosing: false,
      } : win
    )));
  };

  const minimizeWindow = (id) => {
    setWindows((prev) => prev.map((win) => (
      win.id === id ? { ...win, isMinimized: true } : win
    )));
    setActiveWindow((prev) => (prev === id ? null : prev));
  };

  const restoreWindow = (id) => {
    nextZIndex.current += 1;
    setWindows((prev) => prev.map((win) => (
      win.id === id
        ? {
          ...win,
          zIndex: nextZIndex.current,
          isMinimized: false,
          isClosing: false,
        }
        : win
    )));
    setActiveWindow(id);
    setIsStartOpen(false);
  };

  const handleTaskbarWindowClick = (id) => {
    const targetWindow = windows.find((win) => win.id === id);
    if (!targetWindow || targetWindow.isClosing) return;

    if (targetWindow.isMinimized) {
      restoreWindow(id);
      return;
    }

    if (activeWindow === id) {
      minimizeWindow(id);
      return;
    }

    handleFocus(id);
  };

  const openBlankNotepad = () => {
    setNotepadState({
      title: 'Sem titulo.txt',
      content: '',
      fileId: null,
      fileOrigin: 'draft',
      loading: false,
      statusMessage: 'Novo arquivo',
    });
    openWindow(PROGRAMS.NOTEPAD);
  };

  const openDocument = async (file) => {
    if (file.source === 'user') {
      setNotepadState({
        title: file.name,
        content: file.content,
        fileId: file.id,
        fileOrigin: 'user',
        loading: false,
        statusMessage: 'Arquivo carregado de Meus Documentos',
      });
      openWindow(PROGRAMS.NOTEPAD);
      return;
    }

    setNotepadState({
      title: file.name,
      content: 'Carregando arquivo...',
      fileId: null,
      fileOrigin: 'builtin',
      loading: true,
      statusMessage: 'Abrindo arquivo',
    });
    openWindow(PROGRAMS.NOTEPAD);

    try {
      const response = await fetch(file.path);
      const text = await response.text();
      setNotepadState({
        title: file.name,
        content: text,
        fileId: null,
        fileOrigin: 'builtin',
        loading: false,
        statusMessage: 'Arquivo somente leitura carregado',
      });
    } catch (error) {
      setNotepadState({
        title: file.name,
        content: 'Nao foi possivel abrir este arquivo.',
        fileId: null,
        fileOrigin: 'builtin',
        loading: false,
        statusMessage: 'Falha ao abrir o arquivo',
      });
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();

    if (
      credentials.username === LOGIN_USERNAME
      && credentials.password === LOGIN_PASSWORD
    ) {
      setLoginError('');
      setCredentials({ username: '', password: '' });
      resetDesktopState();
      setScreen('welcome');
      return;
    }

    setLoginError('Usuario ou senha incorretos.');
  };

  const handleLogOff = () => {
    resetDesktopState();
    setCredentials({ username: '', password: '' });
    setLoginError('');
    setScreen('loggingOff');
  };

  const handleTurnOff = () => {
    resetDesktopState();
    setScreen('shutdown');
  };

  const handleNotepadChange = (value) => {
    setNotepadState((prev) => ({ ...prev, content: value, statusMessage: 'Editando...' }));
  };

  const saveNotepadDocument = () => {
    const rawName = notepadState.fileId && notepadState.fileOrigin === 'user'
      ? notepadState.title
      : window.prompt('Nome do arquivo:', notepadState.title === 'Sem titulo.txt' ? 'Novo arquivo.txt' : notepadState.title);

    if (rawName == null) return;

    const fileName = sanitizeFileName(rawName);
    if (!fileName) {
      setNotepadState((prev) => ({ ...prev, statusMessage: 'Nome de arquivo invalido' }));
      return;
    }

    const timestamp = new Date().toISOString();

    setUserDocuments((prev) => {
      const duplicate = prev.find((doc) => doc.name.toLowerCase() === fileName.toLowerCase() && doc.id !== notepadState.fileId);
      if (duplicate) {
        setNotepadState((current) => ({ ...current, statusMessage: 'Ja existe um arquivo com esse nome' }));
        return prev;
      }

      if (notepadState.fileId && notepadState.fileOrigin === 'user') {
        return prev.map((doc) => (
          doc.id === notepadState.fileId
            ? { ...doc, name: fileName, content: notepadState.content, updatedAt: timestamp }
            : doc
        ));
      }

      const newDocument = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name: fileName,
        content: notepadState.content,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setNotepadState((current) => ({
        ...current,
        title: newDocument.name,
        fileId: newDocument.id,
        fileOrigin: 'user',
        statusMessage: 'Arquivo salvo em Meus Documentos',
      }));

      return [...prev, newDocument];
    });

    if (notepadState.fileId && notepadState.fileOrigin === 'user') {
      setNotepadState((prev) => ({
        ...prev,
        title: fileName,
        statusMessage: 'Alteracoes salvas em Meus Documentos',
      }));
    }
  };

  const deleteUserDocument = (documentId) => {
    const documentToDelete = userDocuments.find((doc) => doc.id === documentId);
    if (!documentToDelete) return;

    setUserDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setRecycleBinItems((prev) => [
      {
        ...documentToDelete,
        deletedAt: new Date().toISOString(),
      },
      ...prev,
    ]);

    if (notepadState.fileId === documentId) {
      setNotepadState({
        title: 'Sem titulo.txt',
        content: '',
        fileId: null,
        fileOrigin: 'draft',
        loading: false,
        statusMessage: 'O arquivo aberto foi movido para a Lixeira',
      });
    }
  };

  const restoreRecycleBinItem = (documentId) => {
    const item = recycleBinItems.find((doc) => doc.id === documentId);
    if (!item) return;

    setRecycleBinItems((prev) => prev.filter((doc) => doc.id !== documentId));
    setUserDocuments((prev) => {
      const nameExists = prev.some((doc) => doc.name.toLowerCase() === item.name.toLowerCase());
      const restoredName = nameExists ? sanitizeFileName(`${item.name.replace(/\.txt$/i, '')} restaurado.txt`) : item.name;
      return [...prev, { ...item, name: restoredName, updatedAt: new Date().toISOString() }];
    });
  };

  const deletePermanently = (documentId) => {
    setRecycleBinItems((prev) => prev.filter((doc) => doc.id !== documentId));
  };

  const emptyRecycleBin = () => {
    setRecycleBinItems([]);
  };

  const openControlPanel = () => {
    openWindow(PROGRAMS.CONTROL_PANEL);
  };

  const handleToggleTaskbar = () => {
    setTaskbarTall((prev) => !prev);
    setControlMessage('A altura da barra de tarefas foi alterada.');
  };

  const handleNextWallpaper = () => {
    setWallpaper((prev) => {
      if (prev === 'bliss') return 'sky';
      if (prev === 'sky') return 'olive';
      return 'bliss';
    });
    setControlMessage('O papel de parede foi atualizado.');
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => !prev);
    setControlMessage(soundEnabled ? 'Os sons do sistema foram desativados.' : 'Os sons do sistema foram ativados.');
  };

  const handleTestLogonSound = () => {
    playSound('logon');
    setControlMessage('Som de logon reproduzido.');
  };

  const handleClearNotepad = () => {
    setNotepadState({
      title: 'Sem titulo.txt',
      content: '',
      fileId: null,
      fileOrigin: 'draft',
      loading: false,
      statusMessage: 'Bloco de Notas limpo',
    });
    setControlMessage('As anotacoes locais do Bloco de Notas foram limpas.');
  };

  const allDocuments = [
    ...DOCUMENT_FILES.map((file) => ({ ...file, source: 'builtin', canDelete: false })),
    ...userDocuments.map((file) => ({
      ...file,
      icon: '📄',
      source: 'user',
      canDelete: true,
    })),
  ];

  const renderAppContent = (type) => {
    switch (type) {
      case PROGRAMS.NOTEPAD:
        return (
          <NotepadWindow
            notepadState={notepadState}
            onChangeContent={handleNotepadChange}
            onNewFile={openBlankNotepad}
            onSave={saveNotepadDocument}
          />
        );
      case PROGRAMS.CALC:
        return <Calculator />;
      case PROGRAMS.IE:
        return (
          <BrowserWindow
            browserState={browserState}
            activeTab={activeBrowserTab}
            onSelectTab={(tabId) => setBrowserState((prev) => ({ ...prev, activeTabId: tabId }))}
            onChangeAddress={setBrowserAddressInput}
            onNavigate={navigateBrowserTab}
            onBack={(tabId) => moveBrowserHistory(tabId, -1)}
            onForward={(tabId) => moveBrowserHistory(tabId, 1)}
            onNewTab={() => createNewBrowserTab()}
            onCloseTab={closeBrowserTab}
          />
        );
      case PROGRAMS.MY_COMPUTER:
        return (
          <ExplorerWindow
            explorerView={explorerView}
            setExplorerView={setExplorerView}
            rootItems={ROOT_ITEMS}
            documentFiles={allDocuments}
            onOpenDocument={openDocument}
            onDeleteDocument={deleteUserDocument}
          />
        );
      case PROGRAMS.TRASH:
        return (
          <RecycleBinWindow
            items={recycleBinItems}
            onRestore={restoreRecycleBinItem}
            onDeletePermanently={deletePermanently}
            onEmpty={emptyRecycleBin}
          />
        );
      case PROGRAMS.CONTROL_PANEL:
        return (
          <ControlPanelWindow
            controlMessage={controlMessage}
            taskbarTall={taskbarTall}
            wallpaper={wallpaper}
            soundEnabled={soundEnabled}
            onToggleTaskbar={handleToggleTaskbar}
            onNextWallpaper={handleNextWallpaper}
            onToggleSound={handleToggleSound}
            onTestLogon={handleTestLogonSound}
            onClearNotepad={handleClearNotepad}
          />
        );
      default:
        return <div className="p-4">Em breve...</div>;
    }
  };

  if (screen === 'boot') return <BootScreen />;
  if (screen === 'login') {
    return (
      <LoginScreen
        credentials={credentials}
        loginError={loginError}
        onChange={setCredentials}
        onSubmit={handleLoginSubmit}
        onTurnOff={handleTurnOff}
      />
    );
  }
  if (screen === 'welcome') return <WelcomeScreen />;
  if (screen === 'loggingOff') return <LogoffScreen />;
  if (screen === 'shutdown') return <ShutdownScreen shutdownComplete={shutdownComplete} />;

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-[#3A6EA5] relative font-sans"
      style={{ backgroundImage: WALLPAPERS[wallpaper], backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="h-full w-full p-4 flex flex-col gap-8 items-start select-none" style={{ paddingBottom: `${taskbarHeight + 16}px` }}>
        <DesktopIcon icon="💻" label="Meu Computador" onClick={() => openWindow(PROGRAMS.MY_COMPUTER)} />
        <DesktopIcon icon="🗑️" label="Lixeira" onClick={() => openWindow(PROGRAMS.TRASH)} />
        <DesktopIcon icon="🌐" label="Internet Explorer" onClick={() => openWindow(PROGRAMS.IE)} />
      </div>

      {windows.map((win) => (
        <Window
          key={win.id}
          id={win.id}
          title={win.type === PROGRAMS.NOTEPAD ? notepadState.title : win.type}
          icon={PROGRAM_ICONS[win.type] || '⚙️'}
          active={activeWindow === win.id}
          initialPosition={win.initialPosition}
          initialSize={win.initialSize}
          onClose={() => closeWindow(win.id)}
          onMinimize={() => minimizeWindow(win.id)}
          onFocus={handleFocus}
          zIndex={win.zIndex}
          taskbarHeight={taskbarHeight}
          isMinimized={Boolean(win.isMinimized)}
          isClosing={Boolean(win.isClosing)}
        >
          {renderAppContent(win.type)}
        </Window>
      ))}

      <div className="absolute bottom-0 left-0 bg-gradient-to-b from-[#245EDC] via-[#3F8CFF] to-[#245EDC] w-full flex items-center justify-between z-20 border-t border-blue-400 shadow-inner" style={{ height: `${taskbarHeight}px` }}>
        <button
          type="button"
          onClick={() => setIsStartOpen((prev) => !prev)}
          className="h-full px-4 bg-gradient-to-b from-[#388E3C] to-[#2E7D32] rounded-r-2xl flex items-center gap-2 hover:brightness-110 shadow-lg border-r border-green-700"
        >
          <span className="text-white italic font-black text-xl drop-shadow-md">start</span>
        </button>

        <div className="flex-1 flex gap-1 px-2 overflow-hidden">
          {windows.map((win) => (
            <div
              key={win.id}
              className={`px-3 py-1 text-xs text-white border border-blue-800 rounded min-w-[100px] cursor-pointer truncate transition-all duration-200 ${activeWindow === win.id && !win.isMinimized ? 'bg-[#1E50BD] shadow-inner' : 'bg-[#3C81F3]'} ${win.isMinimized ? 'opacity-80 translate-y-[1px]' : 'opacity-100'}`}
              onClick={() => handleTaskbarWindowClick(win.id)}
            >
              {win.type === PROGRAMS.NOTEPAD ? notepadState.title : win.type}
            </div>
          ))}
        </div>

        <div className="h-full bg-[#0997FF] border-l border-blue-400 px-4 flex items-center text-white text-xs gap-2 shadow-inner">
          <div className="flex gap-2 mr-2">🔊 🛡️</div>
          <span className="font-bold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {isStartMenuMounted && (
        <StartMenu
          openWindow={openWindow}
          openBlankNotepad={openBlankNotepad}
          openControlPanel={openControlPanel}
          onLogOff={handleLogOff}
          onTurnOff={handleTurnOff}
          taskbarHeight={taskbarHeight}
          isOpen={isStartMenuVisible}
        />
      )}
    </div>
  );
}

function NotepadWindow({ notepadState, onChangeContent, onNewFile, onSave }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 py-2 bg-[#ECE9D8] border-b border-[#d2ccb8] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-2 py-1 border border-[#b0a78d] bg-white hover:bg-[#fffceb]"
            onClick={onNewFile}
          >
            Novo
          </button>
          <button
            type="button"
            className="px-2 py-1 border border-[#b0a78d] bg-white hover:bg-[#fffceb]"
            onClick={onSave}
          >
            Salvar
          </button>
        </div>
        <div className="text-slate-600">
          {notepadState.loading ? 'Abrindo documento...' : notepadState.statusMessage}
        </div>
      </div>

      <div className="px-3 py-1 text-xs bg-[#f7f3e8] border-b border-[#e0d8c4] text-slate-600">
        {notepadState.title}
      </div>

      <textarea
        className="w-full h-full p-3 outline-none resize-none font-mono text-sm"
        placeholder="Digite algo aqui..."
        value={notepadState.content}
        onChange={(e) => onChangeContent(e.target.value)}
      />
    </div>
  );
}

function ExplorerWindow({ explorerView, setExplorerView, rootItems, documentFiles, onOpenDocument, onDeleteDocument }) {
  const items = explorerView === 'documents' ? documentFiles : rootItems;

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 py-2 bg-[#ECE9D8] border-b border-[#d2ccb8] flex items-center gap-3 text-xs">
        <button
          type="button"
          className="px-2 py-1 border border-[#b0a78d] bg-white disabled:opacity-40"
          onClick={() => setExplorerView('root')}
          disabled={explorerView === 'root'}
        >
          Voltar
        </button>
        <span>{explorerView === 'documents' ? 'Meu Computador > Meus Documentos' : 'Meu Computador'}</span>
      </div>

      <div className="p-4 grid grid-cols-1 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 hover:bg-blue-50 p-2 rounded border border-transparent hover:border-blue-100"
          >
            <button
              type="button"
              className="flex items-center gap-3 text-left flex-1 min-w-0"
              onDoubleClick={() => {
                if (item.type === 'folder') {
                  setExplorerView('documents');
                  return;
                }

                onOpenDocument(item);
              }}
              onClick={() => {
                if (item.type === 'folder') {
                  setExplorerView('documents');
                }
              }}
            >
              <span className="text-3xl shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <div className="text-sm truncate">{item.name}</div>
                {item.source === 'user' && <div className="text-[11px] text-slate-500">Arquivo salvo pelo usuario</div>}
                {item.source === 'builtin' && <div className="text-[11px] text-slate-500">Arquivo padrao do sistema</div>}
              </div>
            </button>

            {item.canDelete && (
              <button
                type="button"
                className="px-2 py-1 text-xs border border-[#b45858] bg-[#fff0f0] text-[#8b2323] hover:bg-[#ffe2e2]"
                onClick={() => onDeleteDocument(item.id)}
              >
                Excluir
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RecycleBinWindow({ items, onRestore, onDeletePermanently, onEmpty }) {
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="px-3 py-2 bg-[#ECE9D8] border-b border-[#d2ccb8] flex items-center justify-between gap-3 text-xs">
        <span>Lixeira</span>
        <button
          type="button"
          className="px-2 py-1 border border-[#b0a78d] bg-white hover:bg-[#fffceb] disabled:opacity-40"
          onClick={onEmpty}
          disabled={items.length === 0}
        >
          Esvaziar lixeira
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
          A Lixeira esta vazia.
        </div>
      ) : (
        <div className="p-4 flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 p-2 border border-slate-200 rounded hover:bg-slate-50">
              <div className="min-w-0">
                <div className="text-sm truncate">{item.name}</div>
                <div className="text-[11px] text-slate-500">
                  Excluido em {new Date(item.deletedAt).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  className="px-2 py-1 text-xs border border-[#6a8f4e] bg-[#eef8e2] text-[#35561d] hover:bg-[#e0f1cd]"
                  onClick={() => onRestore(item.id)}
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-xs border border-[#b45858] bg-[#fff0f0] text-[#8b2323] hover:bg-[#ffe2e2]"
                  onClick={() => onDeletePermanently(item.id)}
                >
                  Excluir definitivo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BrowserWindow({
  browserState,
  activeTab,
  onSelectTab,
  onChangeAddress,
  onNavigate,
  onBack,
  onForward,
  onNewTab,
  onCloseTab,
}) {
  const [closingTabIds, setClosingTabIds] = useState([]);
  const closeTabTimersRef = useRef({});

  useEffect(() => () => {
    Object.values(closeTabTimersRef.current).forEach((timer) => window.clearTimeout(timer));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!activeTab) return;
    onNavigate(activeTab.id, activeTab.addressInput);
  };

  const beginCloseTab = (tabId) => {
    if (closeTabTimersRef.current[tabId]) return;

    setClosingTabIds((prev) => [...prev, tabId]);
    closeTabTimersRef.current[tabId] = window.setTimeout(() => {
      onCloseTab(tabId);
      setClosingTabIds((prev) => prev.filter((currentId) => currentId !== tabId));
      delete closeTabTimersRef.current[tabId];
    }, TAB_CLOSE_TRANSITION_MS);
  };

  if (!activeTab) {
    return <div className="p-4 text-sm text-slate-600">Nenhuma aba aberta.</div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#F3F0E2]">
      <div className="flex items-end gap-1 px-2 pt-2 bg-[#E7E1CD] border-b border-[#cfc4a6] overflow-x-auto">
        {browserState.tabs.map((tab) => (
          <div
            key={tab.id}
            className={`min-w-[140px] max-w-[220px] flex items-center gap-2 px-3 py-2 border border-b-0 rounded-t-md text-xs cursor-pointer origin-bottom transition-all duration-200 ${
              tab.id === activeTab.id ? 'bg-white border-[#cfc4a6]' : 'bg-[#ddd4bc] border-[#beb396]'
            } ${closingTabIds.includes(tab.id) ? 'opacity-0 scale-90 -translate-y-2 max-w-0 min-w-0 px-0 py-0 border-transparent overflow-hidden pointer-events-none' : 'opacity-100 scale-100 translate-y-0'}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span className="truncate flex-1">{tab.title}</span>
            <button
              type="button"
              className="w-4 h-4 text-[10px] border border-[#8d8168] bg-[#f7f1df] hover:bg-[#fff8eb]"
              onClick={(e) => {
                e.stopPropagation();
                beginCloseTab(tab.id);
              }}
              aria-label={`Fechar ${tab.title}`}
            >
              x
            </button>
          </div>
        ))}

        <button
          type="button"
          className="mb-1 px-2 py-1 text-xs border border-[#8d8168] bg-[#f7f1df] hover:bg-[#fff8eb]"
          onClick={onNewTab}
        >
          + Nova aba
        </button>
      </div>

      <div className="px-2 py-2 border-b border-[#d8cfb8] bg-[#ECE9D8]">
        <div className="flex gap-1 mb-2">
          <button
            type="button"
            className="px-2 py-1 text-xs border border-[#8d8168] bg-white disabled:opacity-40"
            onClick={() => onBack(activeTab.id)}
            disabled={activeTab.historyIndex === 0}
          >
            Voltar
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border border-[#8d8168] bg-white disabled:opacity-40"
            onClick={() => onForward(activeTab.id)}
            disabled={activeTab.historyIndex >= activeTab.history.length - 1}
          >
            Avancar
          </button>
          <button
            type="button"
            className="px-2 py-1 text-xs border border-[#8d8168] bg-white hover:bg-[#fff8eb]"
            onClick={() => window.open(activeTab.currentUrl, '_blank', 'noopener,noreferrer')}
          >
            Abrir fora
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 items-center">
          <span className="text-xs shrink-0">Endereco ou busca:</span>
          <input
            type="text"
            className="flex-1 border border-[#9f9376] px-2 py-1 text-sm bg-white"
            value={activeTab.addressInput}
            onChange={(e) => onChangeAddress(activeTab.id, e.target.value)}
            placeholder="Digite um link ou pesquise no Google"
          />
          <button
            type="submit"
            className="px-3 py-1 text-xs border border-[#8d8168] bg-white hover:bg-[#fff8eb]"
          >
            Ir
          </button>
        </form>
      </div>

      <div className="px-3 py-1 text-[11px] text-slate-600 bg-[#f8f4ea] border-b border-[#e4dbc6]">
        Alguns sites podem bloquear exibicao no navegador embutido. Quando isso acontecer, use "Abrir fora".
      </div>

      <iframe src={activeTab.currentUrl} className="flex-1 w-full border-none bg-white" title={`IE Browser - ${activeTab.title}`} />
    </div>
  );
}

function ControlPanelWindow({
  controlMessage,
  taskbarTall,
  wallpaper,
  soundEnabled,
  onToggleTaskbar,
  onNextWallpaper,
  onToggleSound,
  onTestLogon,
  onClearNotepad,
}) {
  return (
    <div className="h-full bg-[#F7F3E8]">
      <div className="px-4 py-3 border-b border-[#d8cfb8] bg-gradient-to-r from-[#f9f6ef] to-[#efe7d4]">
        <div className="text-lg font-bold text-[#23448b]">Painel de Controle</div>
        <div className="text-xs text-slate-600">Ajustes rapidos para esta simulacao do Windows XP.</div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        <ControlButton title="Barra de tarefas" description={taskbarTall ? 'Altura atual: expandida' : 'Altura atual: padrao'} onClick={onToggleTaskbar} />
        <ControlButton title="Papel de parede" description={`Tema atual: ${wallpaper}`} onClick={onNextWallpaper} />
        <ControlButton title="Som do sistema" description={soundEnabled ? 'Ativado' : 'Desativado'} onClick={onToggleSound} />
        <ControlButton title="Testar logon" description="Reproduz o som de entrada" onClick={onTestLogon} />
        <ControlButton title="Limpar Notepad" description="Remove as anotacoes locais" onClick={onClearNotepad} />
      </div>

      <div className="mx-4 mt-1 p-3 border border-[#c9c0aa] bg-white rounded text-sm text-slate-700">
        {controlMessage}
      </div>
    </div>
  );
}

function ControlButton({ title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-3 bg-white border border-[#c9c0aa] rounded shadow-sm hover:bg-[#fffceb]"
    >
      <div className="font-bold text-[#1c4587]">{title}</div>
      <div className="text-xs text-slate-600 mt-1">{description}</div>
    </button>
  );
}

function BootScreen() {
  return (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center text-white font-sans">
      <div className="text-4xl font-bold italic mb-4">Windows <span className="text-blue-500">XP</span></div>
      <div className="w-48 h-4 border-2 border-gray-600 rounded relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600 animate-[loading_2s_infinite]" style={{ width: '30%' }} />
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

function LoginScreen({ credentials, loginError, onChange, onSubmit, onTurnOff }) {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-[#0b3d91] via-[#1f69cf] to-[#7db9ff] flex flex-col justify-between font-sans">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-4xl flex items-center justify-between gap-10">
          <div className="text-white max-w-md">
            <div className="text-6xl font-light tracking-tight mb-3">Windows XP</div>
            <p className="text-lg text-blue-100">
              Para iniciar sessao, use o usuario <strong>admin</strong> e a senha <strong>12345</strong>.
            </p>
          </div>

          <form onSubmit={onSubmit} className="w-full max-w-sm bg-white/95 rounded-2xl shadow-2xl border border-blue-200 p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ffce54] to-[#ff8c42] border-4 border-white shadow-md" />
              <div>
                <div className="text-2xl font-bold text-[#0b3d91]">Administrador</div>
                <div className="text-sm text-slate-500">Clique para fazer login</div>
              </div>
            </div>

            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="username">
              Nome de usuario
            </label>
            <input
              id="username"
              type="text"
              value={credentials.username}
              onChange={(e) => onChange((prev) => ({ ...prev, username: e.target.value }))}
              className="w-full border border-slate-300 rounded px-3 py-2 mb-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="username"
            />

            <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={credentials.password}
              onChange={(e) => onChange((prev) => ({ ...prev, password: e.target.value }))}
              className="w-full border border-slate-300 rounded px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              autoComplete="current-password"
            />

            {loginError && <p className="mt-3 text-sm text-red-600">{loginError}</p>}

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onTurnOff}
                className="px-5 py-2 rounded border border-[#8d8168] bg-gradient-to-b from-[#f6f2e8] to-[#d8cfb8] text-[#4c4332] font-semibold shadow hover:brightness-105"
              >
                Desligar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded bg-gradient-to-b from-[#4ea1ff] to-[#005be3] text-white font-semibold shadow hover:brightness-110"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="h-16 bg-gradient-to-r from-[#0b3d91] via-[#1f69cf] to-[#0b3d91] border-t border-blue-300 flex items-center justify-between px-6 text-white">
        <span className="text-sm">Depois de fazer login, o desktop sera carregado.</span>
        <span className="text-sm font-semibold">Windows XP Professional</span>
      </div>
    </div>
  );
}

function ShutdownScreen({ shutdownComplete }) {
  if (shutdownComplete) {
    return (
      <div className="h-screen w-screen bg-black flex items-center justify-center text-[#d6e4ff] font-sans">
        <div className="text-center">
          <div className="text-3xl mb-4">Windows XP</div>
          <p className="text-lg">A aplicacao foi encerrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0b3d91] flex flex-col items-center justify-center text-white font-sans">
      <div className="text-5xl font-light mb-8">Windows XP</div>
      <p className="text-2xl">Salvando suas configuracoes...</p>
      <p className="mt-3 text-blue-100">Desligando o computador...</p>
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-[#0b3d91] via-[#245fdc] to-[#5aa2ff] flex items-center justify-center text-white font-sans">
      <div className="w-full max-w-3xl px-10">
        <div className="text-6xl font-light tracking-tight mb-10">Bem-vindo</div>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ffce54] to-[#ff8c42] border-4 border-white shadow-xl" />
          <div>
            <div className="text-3xl font-semibold">Administrador</div>
            <div className="text-blue-100 text-lg">Carregando suas configuracoes pessoais...</div>
          </div>
        </div>

        <div className="mt-10 h-3 w-full rounded-full border border-blue-200/60 bg-white/10 overflow-hidden">
          <div className="h-full w-1/4 bg-gradient-to-r from-[#d8ecff] via-white to-[#d8ecff] animate-[xpLoad_1.3s_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes xpLoad {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
}

function LogoffScreen() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-b from-[#2c5da8] via-[#1b4f95] to-[#0b3d91] flex items-center justify-center text-white font-sans">
      <div className="w-full max-w-3xl px-10">
        <div className="text-6xl font-light tracking-tight mb-10">Fazendo logoff</div>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ffce54] to-[#ff8c42] border-4 border-white shadow-xl" />
          <div>
            <div className="text-3xl font-semibold">Administrador</div>
            <div className="text-blue-100 text-lg">Salvando suas configuracoes...</div>
          </div>
        </div>

        <div className="mt-10 h-3 w-full rounded-full border border-blue-200/60 bg-white/10 overflow-hidden">
          <div className="h-full w-1/4 bg-gradient-to-r from-[#d8ecff] via-white to-[#d8ecff] animate-[xpLoad_1.3s_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes xpLoad {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(420%); }
        }
      `}</style>
    </div>
  );
}

function DesktopIcon({ icon, label, onClick }) {
  return (
    <div className="flex flex-col items-center w-20 cursor-pointer group" onDoubleClick={onClick}>
      <div className="text-4xl drop-shadow-lg group-hover:brightness-110">{icon}</div>
      <div className="text-white text-[11px] text-center mt-1 px-1 bg-transparent group-hover:bg-[#0B61FF] rounded-sm shadow-sm font-medium">
        {label}
      </div>
    </div>
  );
}

function StartMenu({
  openWindow,
  openBlankNotepad,
  openControlPanel,
  onLogOff,
  onTurnOff,
  taskbarHeight,
  isOpen,
}) {
  return (
    <div
      className={`absolute left-0 w-80 bg-white rounded-t-lg shadow-2xl flex flex-col border-2 border-blue-600 z-[1000] overflow-hidden transition-all duration-200 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-6 pointer-events-none'}`}
      style={{ bottom: `${taskbarHeight}px` }}
    >
      <div className="bg-gradient-to-r from-[#1D5ADA] to-[#428EFF] p-4 flex items-center gap-3 border-b border-blue-400">
        <div className="w-10 h-10 bg-orange-400 border-2 border-white rounded shadow-md" />
        <span className="text-white font-bold text-lg drop-shadow-md">Administrador</span>
      </div>
      <div className="flex bg-white h-80">
        <div className="w-1/2 p-2 border-r flex flex-col gap-2">
          <button type="button" onClick={() => openWindow(PROGRAMS.IE)} className="text-xs flex items-center gap-2 hover:bg-[#2F71E7] hover:text-white p-1 w-full text-left rounded">🌐 Internet</button>
          <button type="button" onClick={openBlankNotepad} className="text-xs flex items-center gap-2 hover:bg-[#2F71E7] hover:text-white p-1 w-full text-left rounded">📝 Notepad</button>
          <button type="button" onClick={() => openWindow(PROGRAMS.CALC)} className="text-xs flex items-center gap-2 hover:bg-[#2F71E7] hover:text-white p-1 w-full text-left rounded">🧮 Calculator</button>
        </div>
        <div className="w-1/2 bg-[#D3E5FA] p-2 flex flex-col gap-2 border-l border-blue-100">
          <button type="button" onClick={() => openWindow(PROGRAMS.MY_COMPUTER)} className="text-xs font-bold text-[#00156E] hover:bg-[#2F71E7] hover:text-white p-1 rounded">My Computer</button>
          <div className="h-px bg-blue-200 my-1" />
          <button type="button" onClick={openControlPanel} className="text-xs text-[#00156E] hover:bg-[#2F71E7] hover:text-white p-1 rounded">Control Panel</button>
        </div>
      </div>
      <div className="bg-gradient-to-r from-[#1D5ADA] to-[#428EFF] p-2 flex justify-end gap-2">
        <button type="button" className="bg-orange-600 text-white text-xs px-2 py-1 rounded border border-orange-800 hover:bg-orange-500 shadow-sm" onClick={onLogOff}>Log Off</button>
        <button type="button" className="bg-red-700 text-white text-xs px-2 py-1 rounded border border-red-900 hover:bg-red-600 shadow-sm" onClick={onTurnOff}>Turn Off</button>
      </div>
    </div>
  );
}

function Calculator() {
  const [val, setVal] = useState('0');
  const addDigit = (digit) => setVal((prev) => (prev === '0' ? String(digit) : prev + digit));
  const handleCalculatorInput = (button) => {
    if (button === 'C') {
      setVal('0');
      return;
    }

    if (button === '=') {
      setVal((prev) => evaluateExpression(prev));
      return;
    }

    addDigit(button);
  };

  return (
    <div className="p-4 bg-[#ECE9D8] h-full flex flex-col gap-2 select-none">
      <div className="bg-white border-inset border-2 p-2 text-right text-xl font-mono shadow-inner border-gray-400">{val}</div>
      <div className="grid grid-cols-4 gap-1 flex-1">
        {[7, 8, 9, '/', 4, 5, 6, '*', 1, 2, 3, '-', 0, 'C', '=', '+'].map((btn) => (
          <button
            type="button"
            key={btn}
            onClick={() => handleCalculatorInput(btn)}
            className="border shadow-sm active:shadow-inner bg-[#F5F5F5] hover:bg-white text-blue-800 font-bold"
          >
            {btn}
          </button>
        ))}
      </div>
    </div>
  );
}
