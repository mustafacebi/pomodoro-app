import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import { styles } from './styles';

const DEFAULT_WORK_MINUTES = 25;
const DEFAULT_BREAK_MINUTES = 5;
const MIN_MINUTES = 1;
const MAX_MINUTES = 120;
const DEFAULT_PROJECT_ID = 'default-project';
const BREAK_EXTENSION_SECONDS = 5 * 60;
const STORAGE_KEY = 'pomodoro-app-state-v1';

const THEME_OPTIONS = [
  {
    id: 'deepBlue',
    name: 'Deep Blue',
    work: {
      background: '#101D3A',
      accent: '#E6B450',
      pill: '#FFE3A6',
      label: 'Odak',
    },
    break: {
      background: '#142A4F',
      accent: '#67D4C0',
      pill: '#C8F4EA',
      label: 'Mola',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    work: {
      background: '#313A24',
      accent: '#D3B35C',
      pill: '#E6D29A',
      label: 'Odak',
    },
    break: {
      background: '#3F472E',
      accent: '#B8C07A',
      pill: '#D9DEAA',
      label: 'Mola',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    work: {
      background: '#20232B',
      accent: '#F2A65A',
      pill: '#FFD2A3',
      label: 'Odak',
    },
    break: {
      background: '#2E313A',
      accent: '#8AD4FF',
      pill: '#C9ECFF',
      label: 'Mola',
    },
  },
];

const clampMinutes = (minutes) =>
  Math.min(Math.max(minutes, MIN_MINUTES), MAX_MINUTES);

const getHistoryDate = (historyItem) =>
  new Date(historyItem.completedAt || historyItem.id);

const getHistorySeconds = (historyItem) =>
  historyItem.durationSeconds || historyItem.minutes * 60;

const canUseLocalStorage = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage;

const createInitialProjects = () => [
  {
    id: DEFAULT_PROJECT_ID,
    name: 'Genel Çalışma',
    history: [],
  },
];

export default function App() {
  const { width } = useWindowDimensions();
  const audioContextRef = useRef(null);
  const hasLoadedStorageRef = useRef(false);
  const hasRestoredTimerRef = useRef(false);
  const shouldPreserveTimerOnPauseRef = useRef(false);
  const [workMinutes, setWorkMinutes] = useState(DEFAULT_WORK_MINUTES);
  const [breakMinutes, setBreakMinutes] = useState(DEFAULT_BREAK_MINUTES);
  const [workMinutesInput, setWorkMinutesInput] = useState(
    String(DEFAULT_WORK_MINUTES)
  );
  const [breakMinutesInput, setBreakMinutesInput] = useState(
    String(DEFAULT_BREAK_MINUTES)
  );
  const [secondsLeft, setSecondsLeft] = useState(
    DEFAULT_WORK_MINUTES * 60
  );
  const [isActive, setIsActive] = useState(false);
  const [isWorkMode, setIsWorkMode] = useState(true);
  const [studyProjects, setStudyProjects] = useState(createInitialProjects);
  const [activeProjectId, setActiveProjectId] = useState(
    DEFAULT_PROJECT_ID
  );
  const [newProjectName, setNewProjectName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFocusReminderVisible, setIsFocusReminderVisible] =
    useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [visibleProjectHistoryIds, setVisibleProjectHistoryIds] =
    useState({});
  const [selectedThemeId, setSelectedThemeId] = useState('deepBlue');
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const isWebLayout = Platform.OS === 'web' && width >= 560;
  const isDesktopLayout = Platform.OS === 'web' && width >= 980;

  const workTime = workMinutes * 60;
  const breakTime = breakMinutes * 60;
  const activeProject =
    studyProjects.find((project) => project.id === activeProjectId) ||
    studyProjects[0];
  const activeProjectSeconds = activeProject.history.reduce(
    (totalSeconds, historyItem) => totalSeconds + getHistorySeconds(historyItem),
    0
  );
  const totalStudySeconds = studyProjects.reduce(
    (totalSeconds, project) =>
      totalSeconds +
      project.history.reduce(
        (projectTotal, historyItem) =>
          projectTotal + getHistorySeconds(historyItem),
        0
      ),
    0
  );
  const selectedTheme =
    THEME_OPTIONS.find((themeOption) => themeOption.id === selectedThemeId) ||
    THEME_OPTIONS[0];

  useEffect(() => {
    if (!canUseLocalStorage()) {
      hasLoadedStorageRef.current = true;
      setIsStorageReady(true);
      return;
    }

    const savedState = window.localStorage.getItem(STORAGE_KEY);

    if (!savedState) {
      hasLoadedStorageRef.current = true;
      setIsStorageReady(true);
      return;
    }

    try {
      const parsedState = JSON.parse(savedState);
      const savedWorkMinutes = clampMinutes(
        Number(parsedState.workMinutes) || DEFAULT_WORK_MINUTES
      );
      const savedBreakMinutes = clampMinutes(
        Number(parsedState.breakMinutes) || DEFAULT_BREAK_MINUTES
      );
      const savedProjects = Array.isArray(parsedState.studyProjects)
        ? parsedState.studyProjects
        : createInitialProjects();
      const savedActiveProjectExists = savedProjects.some(
        (project) => project.id === parsedState.activeProjectId
      );
      const savedThemeExists = THEME_OPTIONS.some(
        (themeOption) => themeOption.id === parsedState.selectedThemeId
      );
      const savedIsWorkMode =
        typeof parsedState.isWorkMode === 'boolean'
          ? parsedState.isWorkMode
          : true;
      const savedModeSeconds = savedIsWorkMode
        ? savedWorkMinutes * 60
        : savedBreakMinutes * 60;
      const savedSecondsLeft = Math.min(
        Math.max(Number(parsedState.secondsLeft) || savedModeSeconds, 0),
        savedModeSeconds
      );

      setWorkMinutes(savedWorkMinutes);
      setBreakMinutes(savedBreakMinutes);
      setWorkMinutesInput(String(savedWorkMinutes));
      setBreakMinutesInput(String(savedBreakMinutes));
      setStudyProjects(savedProjects.length > 0 ? savedProjects : createInitialProjects());
      setActiveProjectId(
        savedActiveProjectExists
          ? parsedState.activeProjectId
          : savedProjects[0]?.id || DEFAULT_PROJECT_ID
      );
      setSelectedThemeId(
        savedThemeExists ? parsedState.selectedThemeId : 'deepBlue'
      );
      setIsSoundEnabled(parsedState.isSoundEnabled !== false);
      setIsWorkMode(savedIsWorkMode);
      setIsActive(false);
      setIsFocusReminderVisible(parsedState.isFocusReminderVisible === true);
      hasRestoredTimerRef.current = true;
      setSecondsLeft(savedSecondsLeft);
    } catch (error) {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      hasLoadedStorageRef.current = true;
      setIsStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageReady || !hasLoadedStorageRef.current || !canUseLocalStorage()) {
      return;
    }

    const stateToSave = {
      workMinutes,
      breakMinutes,
      studyProjects,
      activeProjectId,
      selectedThemeId,
      isSoundEnabled,
      isWorkMode,
      isFocusReminderVisible,
      secondsLeft,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [
    activeProjectId,
    breakMinutes,
    isFocusReminderVisible,
    isSoundEnabled,
    isWorkMode,
    isStorageReady,
    secondsLeft,
    selectedThemeId,
    studyProjects,
    workMinutes,
  ]);

  const getAudioContext = () => {
    if (!isSoundEnabled || Platform.OS !== 'web' || typeof window === 'undefined') {
      return null;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) {
      return null;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  };

  const playAlertSound = () => {
    const audioContext = getAudioContext();

    if (!audioContext) {
      return;
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 720;
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.12,
      audioContext.currentTime + 0.02
    );
    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + 0.45
    );
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const createStudyHistoryItem = (durationSeconds) => {
    const completedAt = new Date();

    return {
      id: `${completedAt.toISOString()}-${Math.round(durationSeconds)}`,
      minutes: Math.ceil(durationSeconds / 60),
      durationSeconds,
      completedAt: completedAt.toISOString(),
      topic: '',
      time: completedAt.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const saveStudySession = (durationSeconds) => {
    if (durationSeconds <= 0) {
      return;
    }

    const historyItem = createStudyHistoryItem(durationSeconds);

    setStudyProjects((previousProjects) =>
      previousProjects.map((project) =>
        project.id === activeProjectId
          ? {
              ...project,
              history: [historyItem, ...project.history],
            }
          : project
      )
    );
  };

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(interval);
          setIsActive(false);

          if (Platform.OS !== 'web') {
            Vibration.vibrate(500);
          }
          playAlertSound();

          const nextMode = !isWorkMode;

          if (isWorkMode) {
            saveStudySession(workTime);
          } else {
            setIsFocusReminderVisible(true);
          }

          setIsWorkMode(nextMode);
          setIsActive(!nextMode);

          return nextMode ? workTime : breakTime;
        }

        return previousSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    activeProjectId,
    breakTime,
    isActive,
    isSoundEnabled,
    isWorkMode,
    workTime,
  ]);

  useEffect(() => {
    if (hasRestoredTimerRef.current) {
      hasRestoredTimerRef.current = false;
      return;
    }

    if (shouldPreserveTimerOnPauseRef.current) {
      shouldPreserveTimerOnPauseRef.current = false;
      return;
    }

    if (!isActive) {
      setSecondsLeft(isWorkMode ? workTime : breakTime);
    }
  }, [breakTime, isActive, isWorkMode, workTime]);

  const toggleTimer = () => {
    if (!isActive) {
      getAudioContext();
    } else {
      shouldPreserveTimerOnPauseRef.current = true;
    }

    setIsFocusReminderVisible(false);
    setIsActive((previousState) => !previousState);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsFocusReminderVisible(false);
    setSecondsLeft(isWorkMode ? workTime : breakTime);
  };

  const changeMode = () => {
    if (isWorkMode) {
      const studiedSeconds = workTime - secondsLeft;

      saveStudySession(studiedSeconds);
      setIsWorkMode(false);
      setSecondsLeft(breakTime);
      setIsActive(true);
      setIsFocusReminderVisible(false);
      return;
    }

    setIsWorkMode(true);
    setSecondsLeft(workTime);
    setIsActive(true);
    setIsFocusReminderVisible(false);
  };

  const resetAll = () => {
    setIsActive(false);
    setIsWorkMode(true);
    setSecondsLeft(workTime);
    setStudyProjects(createInitialProjects());
    setActiveProjectId(DEFAULT_PROJECT_ID);
    setNewProjectName('');
    setIsMenuOpen(false);
    setIsFocusReminderVisible(false);
  };

  const createStudyProject = () => {
    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      return;
    }

    const projectId = `${Date.now()}-${trimmedName}`;

    setStudyProjects((previousProjects) => [
      {
        id: projectId,
        name: trimmedName,
        history: [],
      },
      ...previousProjects,
    ]);
    setActiveProjectId(projectId);
    setNewProjectName('');
  };

  const selectProject = (projectId) => {
    setActiveProjectId(projectId);
  };

  const toggleProjectHistory = (projectId) => {
    setVisibleProjectHistoryIds((previousValue) => ({
      ...previousValue,
      [projectId]: previousValue[projectId] === false,
    }));
  };

  const updateHistoryTopic = (projectId, historyId, topic) => {
    setStudyProjects((previousProjects) =>
      previousProjects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              history: project.history.map((historyItem) =>
                historyItem.id === historyId
                  ? {
                      ...historyItem,
                      topic,
                    }
                  : historyItem
              ),
            }
          : project
      )
    );
  };

  const startFocusAfterBreak = () => {
    setIsWorkMode(true);
    setSecondsLeft(workTime);
    setIsActive(true);
    setIsFocusReminderVisible(false);
  };

  const extendBreak = () => {
    setIsWorkMode(false);
    setSecondsLeft(BREAK_EXTENSION_SECONDS);
    setIsActive(true);
    setIsFocusReminderVisible(false);
  };

  const updateDuration = (type, value) => {
    const cleanedValue = value.replace(/[^0-9]/g, '');
    const setInput =
      type === 'work' ? setWorkMinutesInput : setBreakMinutesInput;
    const setMinutes = type === 'work' ? setWorkMinutes : setBreakMinutes;

    setInput(cleanedValue);

    if (!cleanedValue) {
      return;
    }

    const nextValue = clampMinutes(Number(cleanedValue));

    setMinutes(nextValue);
    setInput(String(nextValue));
  };

  const commitDuration = (type) => {
    const currentInput =
      type === 'work' ? workMinutesInput : breakMinutesInput;
    const currentValue = type === 'work' ? workMinutes : breakMinutes;

    if (currentInput) {
      return;
    }

    if (type === 'work') {
      setWorkMinutesInput(String(currentValue));
      return;
    }

    setBreakMinutesInput(String(currentValue));
  };

  const stepDuration = (type, amount) => {
    const currentValue = type === 'work' ? workMinutes : breakMinutes;
    const nextValue = clampMinutes(currentValue + amount);

    if (type === 'work') {
      setWorkMinutes(nextValue);
      setWorkMinutesInput(String(nextValue));
      return;
    }

    setBreakMinutes(nextValue);
    setBreakMinutesInput(String(nextValue));
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0'
      )}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(
      2,
      '0'
    )}`;
  };

  const formatStudyDuration = (seconds) => {
    const totalMinutes = Math.ceil(seconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours} sa ${minutes} dk`;
    }

    if (hours > 0) {
      return `${hours} sa`;
    }

    return `${totalMinutes} dk`;
  };

  const totalTime = isWorkMode ? workTime : breakTime;

  const progressPercentage =
    ((totalTime - secondsLeft) / totalTime) * 100;

  const historySummary =
    activeProject.history.length > 0
      ? `${activeProject.name}: ${activeProject.history.length} part`
      : `${activeProject.name}: henüz part yok`;

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfWeek = new Date(startOfToday);
  const mondayOffset = (startOfToday.getDay() + 6) % 7;

  startOfWeek.setDate(startOfToday.getDate() - mondayOffset);

  const allHistoryItems = studyProjects.flatMap((project) => project.history);
  const todayHistoryItems = allHistoryItems.filter(
    (historyItem) => getHistoryDate(historyItem) >= startOfToday
  );
  const weekHistoryItems = allHistoryItems.filter(
    (historyItem) => getHistoryDate(historyItem) >= startOfWeek
  );
  const sumHistorySeconds = (historyItems) =>
    historyItems.reduce(
      (totalSeconds, historyItem) => totalSeconds + getHistorySeconds(historyItem),
      0
    );
  const historyStats = [
    {
      label: 'Bugün',
      duration: formatStudyDuration(sumHistorySeconds(todayHistoryItems)),
      parts: todayHistoryItems.length,
    },
    {
      label: 'Bu hafta',
      duration: formatStudyDuration(sumHistorySeconds(weekHistoryItems)),
      parts: weekHistoryItems.length,
    },
    {
      label: 'Toplam',
      duration: formatStudyDuration(totalStudySeconds),
      parts: allHistoryItems.length,
    },
  ];

  const theme = isWorkMode ? selectedTheme.work : selectedTheme.break;

  const renderDurationRow = (type, label, inputValue) => (
    <View style={styles.durationRow}>
      <Text style={styles.durationLabel}>{label}</Text>
      <View style={styles.durationControl}>
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => stepDuration(type, -1)}
          activeOpacity={0.8}
          disabled={isActive}
        >
          <Text style={styles.stepButtonText}>-</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.durationInput}
          value={inputValue}
          onChangeText={(value) => updateDuration(type, value)}
          onBlur={() => commitDuration(type)}
          keyboardType="number-pad"
          editable={!isActive}
          selectTextOnFocus
        />
        <TouchableOpacity
          style={styles.stepButton}
          onPress={() => stepDuration(type, 1)}
          activeOpacity={0.8}
          disabled={isActive}
        >
          <Text style={styles.stepButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.durationUnit}>dk</Text>
    </View>
  );

  const renderThemeSelector = () => (
    <View style={styles.themeSelector}>
      <TouchableOpacity
        style={styles.themeToggleButton}
        onPress={() =>
          setIsThemePickerOpen((previousValue) => !previousValue)
        }
        activeOpacity={0.8}
      >
        <Text style={styles.themeToggleText}>
          Tema: {selectedTheme.name}
        </Text>
        <Text style={styles.themeToggleIcon}>
          {isThemePickerOpen ? '-' : '+'}
        </Text>
      </TouchableOpacity>

      {isThemePickerOpen && (
        <View style={styles.themeOptions}>
          {THEME_OPTIONS.map((themeOption) => {
            const isSelected = themeOption.id === selectedThemeId;

            return (
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  isSelected && styles.selectedThemeOption,
                ]}
                key={themeOption.id}
                onPress={() => {
                  setSelectedThemeId(themeOption.id);
                  setIsThemePickerOpen(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.themeSwatches}>
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: themeOption.work.background },
                    ]}
                  />
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: themeOption.work.accent },
                    ]}
                  />
                  <View
                    style={[
                      styles.themeSwatch,
                      { backgroundColor: themeOption.break.accent },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.themeOptionText,
                    isSelected && styles.selectedThemeOptionText,
                  ]}
                >
                  {themeOption.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderHistoryPanel = (isDesktopPanel = false) => (
    <View
      style={[
        styles.historyPanel,
        isDesktopPanel && styles.desktopHistoryPanel,
      ]}
    >
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyTitle}>Geçmiş Çalışmalar</Text>
          <Text style={styles.historySubtitle}>
            Tüm çalışmalar {formatStudyDuration(totalStudySeconds)}
          </Text>
        </View>
        {!isDesktopPanel && (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setIsMenuOpen(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsCard}>
        <TouchableOpacity
          style={styles.statsToggleButton}
          onPress={() => setIsStatsOpen((previousValue) => !previousValue)}
          activeOpacity={0.8}
        >
          <View>
            <Text style={styles.statsToggleText}>İstatistik</Text>
            <Text style={styles.statsToggleMeta}>
              Toplam {formatStudyDuration(totalStudySeconds)}
            </Text>
          </View>
          <Text style={styles.statsToggleIcon}>
            {isStatsOpen ? '-' : '+'}
          </Text>
        </TouchableOpacity>

        {isStatsOpen && (
          <View style={styles.statsGrid}>
            {historyStats.map((statItem) => (
              <View style={styles.statBox} key={statItem.label}>
                <Text style={styles.statLabel}>{statItem.label}</Text>
                <Text style={styles.statValue}>{statItem.duration}</Text>
                <Text style={styles.statMeta}>{statItem.parts} part</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.newProjectCard}>
        <Text style={styles.newProjectTitle}>Yeni çalışma aç</Text>
        <TextInput
          style={styles.projectInput}
          value={newProjectName}
          onChangeText={setNewProjectName}
          placeholder="Örn. Matematik"
          placeholderTextColor="#8D8A7C"
          editable={!isActive}
        />
        <TouchableOpacity
          style={styles.createProjectButton}
          onPress={createStudyProject}
          activeOpacity={0.8}
          disabled={isActive}
        >
          <Text style={styles.createProjectButtonText}>
            Çalışmayı Oluştur
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.historyList}>
        {studyProjects.map((project) => {
          const projectSeconds = project.history.reduce(
            (totalSeconds, historyItem) =>
              totalSeconds + getHistorySeconds(historyItem),
            0
          );
          const isActiveProject = project.id === activeProjectId;
          const isProjectHistoryVisible =
            visibleProjectHistoryIds[project.id] !== false;

          return (
            <View
              style={[
                styles.projectCard,
                isActiveProject && styles.activeProjectCard,
              ]}
              key={project.id}
            >
              <View style={styles.projectHeader}>
                <View style={styles.projectTitleGroup}>
                  <Text style={styles.projectName}>{project.name}</Text>
                  <Text style={styles.projectMeta}>
                    {formatStudyDuration(projectSeconds)} ·{' '}
                    {project.history.length} kayıt
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.selectProjectButton,
                    isActiveProject && styles.selectedProjectButton,
                  ]}
                  onPress={() => selectProject(project.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.selectProjectButtonText,
                      isActiveProject && styles.selectedProjectButtonText,
                    ]}
                  >
                    {isActiveProject ? 'Açık' : 'Aç'}
                  </Text>
                </TouchableOpacity>
              </View>

              {project.history.length === 0 ? (
                <Text style={styles.emptyProjectText}>
                  Bu çalışmada henüz kayıt yok.
                </Text>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.historyToggleButton}
                    onPress={() => toggleProjectHistory(project.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.historyToggleText}>
                      {isProjectHistoryVisible
                        ? 'Kayıtları gizle'
                        : 'Kayıtları göster'}
                    </Text>
                    <Text style={styles.historyToggleIcon}>
                      {isProjectHistoryVisible ? '-' : '+'}
                    </Text>
                  </TouchableOpacity>

                  {isProjectHistoryVisible &&
                    project.history.map((historyItem, index) => {
                      const sessionNumber = project.history.length - index;

                      return (
                        <View style={styles.historyItem} key={historyItem.id}>
                          <View style={styles.partBadge}>
                            <Text style={styles.partBadgeText}>
                              {sessionNumber}
                            </Text>
                          </View>
                          <View style={styles.historyItemContent}>
                            <TextInput
                              style={styles.topicInput}
                              value={historyItem.topic || ''}
                              onChangeText={(topic) =>
                                updateHistoryTopic(
                                  project.id,
                                  historyItem.id,
                                  topic
                                )
                              }
                              placeholder="Konu adı ekle"
                              placeholderTextColor="#8D98AB"
                            />
                            <Text style={styles.historyDate}>
                              {historyItem.time}
                            </Text>
                            <Text style={styles.historyMinutes}>
                              {formatStudyDuration(
                                getHistorySeconds(historyItem)
                              )}{' '}
                              çalışma
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                </>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.menuThemeCard}>{renderThemeSelector()}</View>
    </View>
  );

  return (
    <View style={[styles.appShell, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          isDesktopLayout && styles.webContainer,
          isWebLayout && !isDesktopLayout && styles.webCompactContainer,
          { backgroundColor: theme.background },
        ]}
      >
        <View style={[styles.header, isWebLayout && styles.webHeader]}>
          <Text style={styles.appName}>POMODORO SAYACI</Text>
          <View style={styles.headerActions}>
            <View
              style={[styles.modePill, { backgroundColor: theme.pill }]}
            >
              <Text style={[styles.modePillText, { color: theme.accent }]}>
                {theme.label}
              </Text>
            </View>
            {!isDesktopLayout && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() =>
                  setIsMenuOpen((previousState) => !previousState)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.menuButtonText}>☰</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          style={[styles.timerCard, isWebLayout && styles.webMainCard]}
        >
          <Text style={styles.title}>
            {isWorkMode ? 'Çalışma Zamanı' : 'Mola Zamanı'}
          </Text>

          <Text style={styles.description}>
            {isWorkMode
              ? `${activeProject.name} için tek bir işe odaklan.`
              : 'Mola başladı. Nefes al, su iç, kısa bir ara ver.'}
          </Text>

          <View style={styles.activeProjectBadge}>
            <Text style={styles.activeProjectLabel}>Aktif çalışma</Text>
            <Text style={styles.activeProjectName}>{activeProject.name}</Text>
          </View>

          <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(progressPercentage, 100)}%`,
                  backgroundColor: theme.pill,
                },
              ]}
            />
          </View>

          <Text style={styles.statusText}>
            {isActive ? 'Sayaç çalışıyor' : 'Sayaç durduruldu'}
          </Text>

          {isFocusReminderVisible && (
            <View style={styles.reminderBanner}>
              <Text style={styles.reminderTitle}>Mola bitti</Text>
              <Text style={styles.reminderText}>
                Çalışmaya tekrar başlama zamanı.
              </Text>
              <View style={styles.reminderActions}>
                <TouchableOpacity
                  style={styles.reminderPrimaryButton}
                  onPress={startFocusAfterBreak}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reminderPrimaryButtonText}>
                    Çalışmaya Başla
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reminderSecondaryButton}
                  onPress={extendBreak}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reminderSecondaryButtonText}>
                    Molayı 5 dk uzat
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View
          style={[
            styles.buttonContainer,
            isWebLayout && styles.webButtonContainer,
          ]}
        >
          <TouchableOpacity
            style={[styles.button, styles.mainButton]}
            onPress={toggleTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {isActive ? 'DURDUR' : 'BAŞLAT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={resetTimer}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>SIFIRLA</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.modeButton}
          onPress={changeMode}
          activeOpacity={0.8}
        >
          <Text style={styles.modeButtonText}>
            {isWorkMode
              ? 'Çalışmayı Bitir / Molaya Geç'
              : 'Molayı Bitir / Çalışmaya Başla'}
          </Text>
        </TouchableOpacity>

        <View
          style={[
            styles.settingsCard,
            isWebLayout && styles.webSettingsCard,
          ]}
        >
          <Text style={styles.settingsTitle}>Süre Ayarları</Text>
          {renderDurationRow('work', 'Çalışma', workMinutesInput)}
          {renderDurationRow('break', 'Mola', breakMinutesInput)}
          <View style={styles.soundRow}>
            <View>
              <Text style={styles.settingsLabel}>Sesli bildirim</Text>
              <Text style={styles.soundHint}>
                Süre bitince kısa bir uyarı sesi çalar.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.soundToggle,
                isSoundEnabled && styles.soundToggleActive,
              ]}
              onPress={() =>
                setIsSoundEnabled((previousValue) => !previousValue)
              }
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.soundToggleText,
                  isSoundEnabled && styles.soundToggleTextActive,
                ]}
              >
                {isSoundEnabled ? 'Açık' : 'Kapalı'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[styles.sessionCard, isWebLayout && styles.webSessionCard]}
        >
          <View>
            <Text style={styles.sessionTitle}>
              {activeProject.name} Toplamı
            </Text>
            <Text style={styles.sessionSubtitle}>{historySummary}</Text>
          </View>
          <Text style={styles.sessionCount}>
            {formatStudyDuration(activeProjectSeconds)}
          </Text>
        </View>

        {totalStudySeconds > 0 && (
          <TouchableOpacity onPress={resetAll}>
            <Text style={styles.resetAllText}>Tüm Verileri Sıfırla</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {isDesktopLayout && renderHistoryPanel(true)}
      {isMenuOpen && !isDesktopLayout && renderHistoryPanel()}
    </View>
  );
}
