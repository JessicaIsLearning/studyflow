document.addEventListener("DOMContentLoaded", () => {

  function renderIcons() {
    if (window.lucide) lucide.createIcons();
  }

  function pluralize(count, word) {
    return `${count} ${word}${count === 1 ? "" : "s"}`;
  }

  // State
  const STORAGE_KEY = "studyflow-state-v1";

  const defaultState = {
    theme: "light",
    activeView: "overview",
    focusSessionsToday: 0,
    tasks: [
      { id: 1, text: "Finish algebra worksheet", subject: "math", important: false, deadline: null, completed: true },
      { id: 2, text: "Read chapter 4 on cell biology", subject: "science", important: true, deadline: "2026-09-11T23:59", completed: false },
      { id: 3, text: "Review WWII timeline notes", subject: "history", important: true, deadline: "2026-09-10T09:00", completed: false },
      { id: 4, text: "Practice 10 flashcards", subject: "math", important: false, deadline: null, completed: true },
      { id: 5, text: "Watch photosynthesis video", subject: "science", important: false, deadline: null, completed: true },
    ],
    pomodoroMinutes: 25,
  };

  function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(defaultState);

    try {
      return { ...structuredClone(defaultState), ...JSON.parse(saved) };
    } catch (error) {
      console.warn("Couldn't read saved StudyFlow data, starting fresh.", error);
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  let state = loadState();


  // Elements
  const navItems = document.querySelectorAll(".nav-item");
  const views = document.querySelectorAll(".view");

  const themeToggle = document.getElementById("themeToggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");
  const themeLabel = themeToggle.querySelector(".theme-label");

  const greetingTitle = document.getElementById("greetingTitle");
  const greetingSubtitle = document.getElementById("greetingSubtitle");
  const dateBadge = document.getElementById("dateBadge");

  // Overview
  const heroPercent = document.getElementById("heroPercent");
  const heroBarFill = document.getElementById("heroBarFill");
  const heroCaption = document.getElementById("heroCaption");
  const focusSnapshotValue = document.getElementById("focusSnapshotValue");
  const taskPreviewList = document.getElementById("taskPreviewList");
  const deadlineList = document.getElementById("deadlineList");

  // Tasks
  const taskList = document.getElementById("taskList");
  const addTaskForm = document.getElementById("addTaskForm");
  const taskInput = document.getElementById("taskInput");
  const subjectSelect = document.getElementById("subjectSelect");
  const importantInput = document.getElementById("importantInput");
  const deadlineInput = document.getElementById("deadlineInput");
  const filterSelect = document.getElementById("filterSelect");
  const emptyState = document.getElementById("emptyState");

  // Progress
  const progressRing = document.getElementById("progressRing");
  const progressRingValue = document.getElementById("progressRingValue");
  const progressCaption = document.getElementById("progressCaption");
  const subjectProgressList = document.getElementById("subjectProgressList");

  // Focus / Pomodoro
  const pomodoroDisplay = document.getElementById("pomodoroDisplay");
  const pomodoroRing = document.getElementById("pomodoroRing");
  const pomodoroCaption = document.getElementById("pomodoroCaption");
  const pomodoroSessionCount = document.getElementById("pomodoroSessionCount");
  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const durationPicker = document.getElementById("durationPicker");
  const customMinutesInput = document.getElementById("customMinutesInput");
  const timerEndSound = document.getElementById("timerEndSound");


  // Greeting / date-time
  function timeOfDayGreeting(hour) {
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function renderDateTime() {
    const now = new Date();

    greetingTitle.textContent = timeOfDayGreeting(now.getHours());

    dateBadge.textContent = now.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    }) + " · " + now.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  renderDateTime();
  setInterval(renderDateTime, 60 * 1000);


  // Navigation
  function showView(viewName) {
    state.activeView = viewName;
    saveState();

    views.forEach((view) => {
      view.classList.toggle("view-active", view.dataset.view === viewName);
    });

    navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });
  }

  navItems.forEach((item) => {
    item.addEventListener("click", () => showView(item.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => showView(btn.dataset.goto));
  });


  // Tasks
  function subjectLabel(subject) {
    return subject.charAt(0).toUpperCase() + subject.slice(1);
  }

  function formatDeadline(deadlineString) {
    if (!deadlineString) return "";

    const date = new Date(deadlineString);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function taskItemHTML(task) {
    const deadlineText = formatDeadline(task.deadline);
    const importantFlag = task.important
      ? `<span class="deadline-flag" title="${deadlineText ? "Due " + deadlineText : "Has a deadline"}"><i data-lucide="flag"></i></span>`
      : "";

    return `
      <li class="task-item ${task.completed ? "completed" : ""}" data-id="${task.id}" data-subject="${task.subject}">
        <label class="task-checkbox-label">
          <input type="checkbox" class="task-checkbox" ${task.completed ? "checked" : ""}>
          <span class="task-text">${task.text}</span>
        </label>
        ${importantFlag}
        <span class="task-tag tag-${task.subject}">${subjectLabel(task.subject)}</span>
        <button class="task-delete-btn" title="Delete task">
          <i data-lucide="x"></i>
        </button>
      </li>
    `;
  }

  function renderTaskList() {
    const filter = filterSelect.value;
    const visibleTasks = state.tasks.filter(
      (task) => filter === "all" || task.subject === filter
    );

    taskList.innerHTML = visibleTasks.map(taskItemHTML).join("");
    emptyState.hidden = visibleTasks.length > 0;

    renderIcons();
  }

  function renderTaskPreview() {
    const previewTasks = state.tasks.slice(0, 4);

    if (previewTasks.length === 0) {
      taskPreviewList.innerHTML = `<p class="empty-mini-note">No tasks yet.</p>`;
      return;
    }

    taskPreviewList.innerHTML = previewTasks.map((task) => `
      <li class="task-preview-item ${task.completed ? "completed" : ""}">
        <span class="task-preview-dot tag-${task.subject}"></span>
        <span>${task.text}</span>
      </li>
    `).join("");
  }


  function renderDeadlines() {
    const deadlines = state.tasks
      .filter((task) => task.important && !task.completed)
      .sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });

    if (deadlines.length === 0) {
      deadlineList.innerHTML = `<p class="empty-mini-note">No upcoming deadlines — nice and clear.</p>`;
      return;
    }

    deadlineList.innerHTML = deadlines.map((task) => {
      const when = formatDeadline(task.deadline);
      return `
        <li class="deadline-item">
          <span class="deadline-icon"><i data-lucide="alert-circle"></i></span>
          <span class="deadline-item-text">
            <span>${task.text}</span>
            ${when ? `<span class="deadline-item-when">Due ${when}</span>` : ""}
          </span>
        </li>
      `;
    }).join("");

    renderIcons();
  }

  // Progress
  function renderProgressNumbers() {
    const total = state.tasks.length;
    const done = state.tasks.filter((t) => t.completed).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    // Hero card (Overview)
    heroPercent.textContent = `${percent}%`;
    heroBarFill.style.width = `${percent}%`;
    heroCaption.textContent = `${done} of ${total} tasks done today`;

    // Progress ring (Progress view)
    progressRing.style.setProperty("--progress", percent);
    progressRingValue.textContent = `${percent}%`;
    progressCaption.textContent = `${done} of ${total} tasks done today`;

    if (total > 0 && done === total) {
      greetingSubtitle.textContent = "All done for today — nice work!";
    } else if (done === 0) {
      greetingSubtitle.textContent = "Let's get your first task done today.";
    } else {
      greetingSubtitle.textContent = "You're making steady progress today.";
    }

    // Focus snapshot text
    focusSnapshotValue.textContent = `${pluralize(state.focusSessionsToday, "session")} today`;
    pomodoroSessionCount.textContent = `${pluralize(state.focusSessionsToday, "session")} completed today`;

    // Progress by subject (Progress view)
    const subjects = ["math", "science", "history"];
    subjectProgressList.innerHTML = subjects.map((subject) => {
      const subjectTasks = state.tasks.filter((t) => t.subject === subject);
      const subjectDone = subjectTasks.filter((t) => t.completed).length;
      const subjectPercent = subjectTasks.length === 0
        ? 0
        : Math.round((subjectDone / subjectTasks.length) * 100);

      return `
        <div class="subject-progress-row">
          <span class="subject-progress-name">${subjectLabel(subject)}</span>
          <div class="subject-progress-track">
            <div class="subject-progress-fill" style="width: ${subjectPercent}%; background-color: var(--color-${subject});"></div>
          </div>
          <span class="subject-progress-percent">${subjectPercent}%</span>
        </div>
      `;
    }).join("");
  }


  function renderEverythingTaskRelated() {
    renderTaskList();
    renderTaskPreview();
    renderDeadlines();
    renderProgressNumbers();
  }

  taskList.addEventListener("change", (event) => {
    if (!event.target.classList.contains("task-checkbox")) return;

    const taskItem = event.target.closest(".task-item");
    const taskId = Number(taskItem.dataset.id);
    const task = state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    task.completed = event.target.checked;
    saveState();
    renderEverythingTaskRelated();
  });

  taskList.addEventListener("click", (event) => {
    const deleteBtn = event.target.closest(".task-delete-btn");
    if (!deleteBtn) return;

    const taskItem = deleteBtn.closest(".task-item");
    const taskId = Number(taskItem.dataset.id);

    state.tasks = state.tasks.filter((t) => t.id !== taskId);
    saveState();
    renderEverythingTaskRelated();
  });

  addTaskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskInput.value.trim();
    if (text === "") return;

    let deadline = null;
    if (importantInput.checked && deadlineInput.value) {
      deadline = deadlineInput.value;
    }

    const newTask = {
      id: Date.now(), 
      text,
      subject: subjectSelect.value,
      important: importantInput.checked,
      deadline,
      completed: false,
    };

    state.tasks.push(newTask);
    saveState();
    renderEverythingTaskRelated();

    taskInput.value = "";
    importantInput.checked = false;
    deadlineInput.value = "";
    deadlineInput.disabled = true;
    taskInput.focus();
  });

  // ---- Filtering ----
  filterSelect.addEventListener("change", renderTaskList);

  importantInput.addEventListener("change", () => {
    deadlineInput.disabled = !importantInput.checked;
    if (!importantInput.checked) {
      deadlineInput.value = "";
    }
  });


  // Pomodoro
  let totalSeconds = state.pomodoroMinutes * 60;
  let secondsRemaining = totalSeconds;
  let timerId = null;

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  function renderTimer() {
    pomodoroDisplay.textContent = formatTime(secondsRemaining);

    const elapsedPercent = Math.round(((totalSeconds - secondsRemaining) / totalSeconds) * 100);
    pomodoroRing.style.setProperty("--progress", elapsedPercent);
  }

  function setTimerButtonsRunning(isRunning) {
    startBtn.disabled = isRunning;
    pauseBtn.disabled = !isRunning;

    durationPicker.querySelectorAll("button, input").forEach((el) => {
      el.disabled = isRunning;
    });
  }

  function setDuration(minutes) {
    if (!minutes || minutes < 1) return;

    totalSeconds = minutes * 60;
    secondsRemaining = totalSeconds;
    state.pomodoroMinutes = minutes;
    saveState();

    pomodoroCaption.textContent = `One focused session = ${pluralize(minutes, "minute")}`;
    renderTimer();
  }

  function setActiveButton(buttons, target) {
    buttons.forEach((b) => b.classList.toggle("active", b === target));
  }

  durationPicker.querySelectorAll(".duration-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setActiveButton(durationPicker.querySelectorAll(".duration-btn"), btn);
      customMinutesInput.value = "";
      setDuration(Number(btn.dataset.minutes));
    });
  });

  customMinutesInput.addEventListener("change", () => {
    const minutes = Math.round(Number(customMinutesInput.value));
    if (!minutes || minutes < 1) return;

    setActiveButton(durationPicker.querySelectorAll(".duration-btn"), null);
    setDuration(Math.min(minutes, 180)); 
  });

  startBtn.addEventListener("click", () => {
    if (timerId !== null) return;
    if (secondsRemaining <= 0) return; 
    setTimerButtonsRunning(true);

    timerId = setInterval(() => {
      secondsRemaining--;
      renderTimer();

      if (secondsRemaining <= 0) {
        clearInterval(timerId);
        timerId = null;
        setTimerButtonsRunning(false);

        state.focusSessionsToday += 1;
        saveState();
        renderProgressNumbers();

        timerEndSound.currentTime = 0;
        timerEndSound.play().catch(() => {});
      }
    }, 1000);
  });

  pauseBtn.addEventListener("click", () => {
    clearInterval(timerId);
    timerId = null;
    setTimerButtonsRunning(false);
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(timerId);
    timerId = null;
    secondsRemaining = totalSeconds;
    setTimerButtonsRunning(false);
    renderTimer();
  });


  // Theme
  function applyTheme(theme) {
    state.theme = theme;

    if (theme === "dark") {
      document.body.setAttribute("data-theme", "dark");
      themeIcon.setAttribute("data-lucide", "sun");
      themeLabel.textContent = "Light Mode";
    } else {
      document.body.removeAttribute("data-theme");
      themeIcon.setAttribute("data-lucide", "moon");
      themeLabel.textContent = "Dark Mode";
    }

    renderIcons(); 
    saveState();
  }

  themeToggle.addEventListener("click", () => {
    applyTheme(state.theme === "dark" ? "light" : "dark");
  });


  // Initial render
  applyTheme(state.theme);
  showView(state.activeView);
  renderEverythingTaskRelated();

  const savedMinutes = state.pomodoroMinutes;
  const matchingPreset = durationPicker.querySelector(`[data-minutes="${savedMinutes}"]`);
  if (matchingPreset) {
    matchingPreset.classList.add("active");
  } else {
    customMinutesInput.value = savedMinutes;
  }
  pomodoroCaption.textContent = `One focused session = ${pluralize(savedMinutes, "minute")}`;

  renderTimer();
  setTimerButtonsRunning(false);
  renderIcons();

});
