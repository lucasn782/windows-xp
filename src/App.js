import React, { useEffect, useEffectEvent, useRef, useState } from 'react';

const INITIAL_Z_INDEX = 10;
const DEFAULT_TASKBAR_HEIGHT = 40;
const TALL_TASKBAR_HEIGHT = 52;
const WINDOW_WIDTH = 600;
const WINDOW_HEIGHT = 400;
const LOGIN_USERNAME = 'admin';
const LOGIN_PASSWORD = '12345';
const HAS_LOGGED_IN_KEY = 'xp_has_logged_in';
const PUBLIC_URL = process.env.PUBLIC_URL || '';
const withPublicUrl = (path) => `${PUBLIC_URL}${path}`;

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

function Window({ id, title, icon, children, onClose, onFocus, zIndex, active, initialPosition, taskbarHeight }) {
  const [pos, setPos] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  // `playSound` is an effect event and intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPos(initialPosition);
  }, [initialPosition]);

  // `playSound` is an effect event and intentionally omitted from deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const nextX = e.clientX - offset.current.x;
      const nextY = e.clientY - offset.current.y;
      const maxX = Math.max(0, window.innerWidth - WINDOW_WIDTH);
      const maxY = Math.max(0, window.innerHeight - WINDOW_HEIGHT - taskbarHeight);

      setPos({
        x: Math.min(Math.max(0, nextX), maxX),
        y: Math.min(Math.max(0, nextY), maxY),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, taskbarHeight]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    onFocus(id);
    setIsDragging(true);
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  return (
    <div
      className={`absolute shadow-2xl border-2 border-[#0054E3] rounded-t-lg bg-[#ECE9D8] flex flex-col overflow-hidden ${active ? 'ring-1 ring-blue-400' : ''}`}
      style={{ left: pos.x, top: pos.y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT, zIndex }}
      onMouseDown={() => onFocus(id)}
    >
      <div
        onMouseDown={handleMouseDown}
        className={`flex items-center justify-between p-1 select-none cursor-move ${active ? 'bg-gradient-to-r from-[#0058EE] to-[#378DFF]' : 'bg-gray-400'}`}
      >
        <div className="flex items-center gap-2 text-white font-bold text-sm px-2">
          <span>{icon}</span>
          <span className="drop-shadow-md">{title}</span>
        </div>
        <div className="flex gap-1 pr-1">
          <button
            type="button"
            className="w-5 h-5 bg-[#0054E3] border border-white text-white flex items-center justify-center text-xs hover:bg-blue-400 font-bold"
            onClick={(e) => e.stopPropagation()}
          >
            _
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
    </div>
  );
}

export default function WindowsXP() {
  const [screen, setScreen] = useState('boot');
  const [shutdownComplete, setShutdownComplete] = useState(false);
  const [windows, setWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [time, setTime] = useState(new Date());
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [explorerView, setExplorerView] = useState('root');
  const [taskbarTall, setTaskbarTall] = useState(false);
  const [wallpaper, setWallpaper] = useState('bliss');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [controlMessage, setControlMessage] = useState('Use os botoes para ajustar o sistema.');
  const [notepadState, setNotepadState] = useState({
    title: 'Notepad',
    content: localStorage.getItem('xp_notepad') || '',
    filePath: null,
    loading: false,
  });
  const nextZIndex = useRef(INITIAL_Z_INDEX);
  const soundCacheRef = useRef({});
  const hasLoggedInRef = useRef(localStorage.getItem(HAS_LOGGED_IN_KEY) === 'true');
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

  const resetDesktopState = () => {
    setWindows([]);
    setActiveWindow(null);
    setIsStartOpen(false);
    setExplorerView('root');
    setControlMessage('Use os botoes para ajustar o sistema.');
    setNotepadState({
      title: 'Notepad',
      content: localStorage.getItem('xp_notepad') || '',
      filePath: null,
      loading: false,
    });
    nextZIndex.current = INITIAL_Z_INDEX;
  };

  const openWindow = (type) => {
    const existingWindow = windows.find((win) => win.type === type);

    if (existingWindow) {
      handleFocus(existingWindow.id);
      return;
    }

    nextZIndex.current += 1;
    const newWindow = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      type,
      zIndex: nextZIndex.current,
      initialPosition: createWindowPosition(windows.length),
    };

    setWindows((prev) => [...prev, newWindow]);
    setActiveWindow(newWindow.id);
    setIsStartOpen(false);
  };

  const closeWindow = (id) => {
    setWindows((prev) => prev.filter((win) => win.id !== id));
    setActiveWindow((prev) => (prev === id ? null : prev));
  };

  const handleFocus = (id) => {
    nextZIndex.current += 1;
    setActiveWindow(id);
    setWindows((prev) => prev.map((win) => (
      win.id === id ? { ...win, zIndex: nextZIndex.current } : win
    )));
  };

  const openBlankNotepad = () => {
    setNotepadState({
      title: 'Notepad',
      content: localStorage.getItem('xp_notepad') || '',
      filePath: null,
      loading: false,
    });
    openWindow(PROGRAMS.NOTEPAD);
  };

  const openDocument = async (file) => {
    setNotepadState({
      title: file.name,
      content: 'Carregando arquivo...',
      filePath: file.path,
      loading: true,
    });
    openWindow(PROGRAMS.NOTEPAD);

    try {
      const response = await fetch(file.path);
      const text = await response.text();
      setNotepadState({
        title: file.name,
        content: text,
        filePath: file.path,
        loading: false,
      });
    } catch (error) {
      setNotepadState({
        title: file.name,
        content: 'Nao foi possivel abrir este arquivo.',
        filePath: file.path,
        loading: false,
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
    setNotepadState((prev) => ({ ...prev, content: value }));

    if (!notepadState.filePath) {
      localStorage.setItem('xp_notepad', value);
    }
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
    localStorage.removeItem('xp_notepad');
    setNotepadState({
      title: 'Notepad',
      content: '',
      filePath: null,
      loading: false,
    });
    setControlMessage('As anotacoes locais do Bloco de Notas foram limpas.');
  };

  const renderAppContent = (type) => {
    switch (type) {
      case PROGRAMS.NOTEPAD:
        return (
          <div className="h-full flex flex-col">
            <div className="px-3 py-1 text-xs bg-[#ECE9D8] border-b border-[#d2ccb8] text-slate-600">
              {notepadState.loading ? 'Abrindo documento...' : notepadState.title}
            </div>
            <textarea
              className="w-full h-full p-3 outline-none resize-none font-mono text-sm"
              placeholder="Digite algo aqui..."
              value={notepadState.content}
              onChange={(e) => handleNotepadChange(e.target.value)}
            />
          </div>
        );
      case PROGRAMS.CALC:
        return <Calculator />;
      case PROGRAMS.IE:
        return (
          <div className="flex flex-col h-full">
            <div className="bg-[#ECE9D8] p-1 border-b flex gap-2 items-center">
              <span className="text-xs">Endereco:</span>
              <input type="text" className="flex-1 border px-2 text-sm" defaultValue="https://www.google.com/webhp?igu=1" />
            </div>
            <iframe src="https://www.google.com/webhp?igu=1" className="flex-1 w-full border-none" title="IE Browser" />
          </div>
        );
      case PROGRAMS.MY_COMPUTER:
        return (
          <ExplorerWindow
            explorerView={explorerView}
            setExplorerView={setExplorerView}
            rootItems={ROOT_ITEMS}
            documentFiles={DOCUMENT_FILES}
            onOpenDocument={openDocument}
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
          onClose={() => closeWindow(win.id)}
          onFocus={handleFocus}
          zIndex={win.zIndex}
          taskbarHeight={taskbarHeight}
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
              className={`px-3 py-1 text-xs text-white border border-blue-800 rounded min-w-[100px] cursor-pointer truncate ${activeWindow === win.id ? 'bg-[#1E50BD] shadow-inner' : 'bg-[#3C81F3]'}`}
              onClick={() => handleFocus(win.id)}
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

      {isStartOpen && (
        <StartMenu
          openWindow={openWindow}
          openBlankNotepad={openBlankNotepad}
          openControlPanel={openControlPanel}
          onLogOff={handleLogOff}
          onTurnOff={handleTurnOff}
          taskbarHeight={taskbarHeight}
        />
      )}
    </div>
  );
}

function ExplorerWindow({ explorerView, setExplorerView, rootItems, documentFiles, onOpenDocument }) {
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

      <div className="p-4 grid grid-cols-4 gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="flex flex-col items-center gap-1 cursor-pointer hover:bg-blue-100 p-2 text-center rounded"
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
            <span className="text-3xl">{item.icon}</span>
            <span className="text-xs">{item.name}</span>
          </button>
        ))}
      </div>
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

function LoginScreen({ credentials, loginError, onChange, onSubmit }) {
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

            <div className="mt-6 flex justify-end">
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

function StartMenu({ openWindow, openBlankNotepad, openControlPanel, onLogOff, onTurnOff, taskbarHeight }) {
  return (
    <div className="absolute left-0 w-80 bg-white rounded-t-lg shadow-2xl flex flex-col border-2 border-blue-600 z-[1000] overflow-hidden" style={{ bottom: `${taskbarHeight}px` }}>
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
