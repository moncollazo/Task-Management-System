const BOARD_COLORS = 
[
    "#eef1f7", 
    "#ffc2be", 
    "#b2e9bd", 
    "#fbe2b4", 
    "#cde4fe", 
    "#f5efff"
];

function createCompletedBoard() {
  return {
    id: "completed-board",
    title: "Completed",
    color: "#dff5e4",
    isCompletedBoard: true,
    tasks: []
  };
}

function ensureCompletedBoard(boards) {
  const hasCompleted = boards.some(board => board.isCompletedBoard);
  if (hasCompleted) {
    const normalBoards = boards.filter(board => !board.isCompletedBoard);
    const completedBoard = boards.find(board => board.isCompletedBoard);
    return [...normalBoards, completedBoard];
  }
  return [...boards, createCompletedBoard()];
}

function getPriorityRank(priority) {
  if (priority === "High") return 1;
  if (priority === "Medium") return 2;
  return 3;
}

function getPriorityClass(priority) {
  const value = (priority || "").toLowerCase();
  if (value === "high") return "priority-high";
  if (value === "medium") return "priority-medium";
  return "priority-low";
}

function getStatusClass(status) {
  if (status === "Overdue") return "status-overdue";
  if (status === "Due Soon") return "status-due-soon";
  if (status === "On Track") return "status-on-track";
  if (status === "Completed") return "status-completed";
  return "status-no-date";
}

const App = () => {
  return React.createElement("div", {
    className: "app"
  }, React.createElement("h1", {
    className: "main-title"
  }, "My Task Manager"), React.createElement(BoardList, null));
};

const BoardList = () => {
  const [boards, setBoards] = React.useState(() => {
    const saved = localStorage.getItem("kanbanBoards");
    const parsed = saved ? JSON.parse(saved) : [];
    return ensureCompletedBoard(parsed);
  });

  const [draggedTask, setDraggedTask] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("All");
  const [boardModalOpen, setBoardModalOpen] = React.useState(false);

  const [boardForm, setBoardForm] = React.useState({
    id: null,
    title: "",
    color: BOARD_COLORS[0]
  });

  const [taskModalOpen, setTaskModalOpen] = React.useState(false);
  const [taskForm, setTaskForm] = React.useState({
    boardId: "",
    taskId: null,
    title: "",
    description: "",
    dueDate: "",
    priority: "Medium",
    notes: ""
  });

  React.useEffect(() => {
    localStorage.setItem("kanbanBoards", JSON.stringify(ensureCompletedBoard(boards)));
  }, [boards]);

  function getTaskStatus(task) {
    if (task.completed) return "Completed";
    if (!task.dueDate) return "No due date";

    const today = new Date();
    const due = new Date(task.dueDate);

    if (isNaN(due.getTime())) return "Invalid date";

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    if (due < today) return "Overdue";

    const diffTime = due - today;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays <= 2) return "Due Soon";
    return "On Track";
  }

  function openAddBoardModal() {
    setBoardForm({
      id: null,
      title: "",
      color: BOARD_COLORS[0]
    });

    setBoardModalOpen(true);
  }

  function openEditBoardModal(board) {
    if (board.isCompletedBoard) return;

    setBoardForm({
      id: board.id,
      title: board.title,
      color: board.color || BOARD_COLORS[0]
    });

    setBoardModalOpen(true);
  }

  function saveBoard(e) {

    e.preventDefault();
    if (!boardForm.title.trim()) return;
    if (boardForm.id) {
      setBoards(prevBoards => ensureCompletedBoard(prevBoards.map(board => board.id === boardForm.id ? {
        ...board,
        title: boardForm.title.trim(),
        color: boardForm.color
      } : board)));
    } else {
      const newBoard = {
        id: Date.now(),
        title: boardForm.title.trim(),
        color: boardForm.color,
        tasks: []
      };
      setBoards(prevBoards => ensureCompletedBoard([...prevBoards, newBoard]));
    }
    setBoardModalOpen(false);
  }

  function deleteBoard(id) {
    const boardToDelete = boards.find(board => board.id === id);
    if (!boardToDelete || boardToDelete.isCompletedBoard) return;
    setBoards(prevBoards => ensureCompletedBoard(prevBoards.filter(board => board.id !== id)));
  }

  function openAddTaskModal(boardId) {
    setTaskForm({
      boardId,
      taskId: null,
      title: "",
      description: "",
      dueDate: "",
      priority: "Medium",
      notes: ""
    });

    setTaskModalOpen(true);
  }

  function openEditTaskModal(boardId, taskId) {
    const board = boards.find(b => b.id === boardId);
    
    if (!board) return;
    
    const task = board.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    setTaskForm({
      boardId,
      taskId,
      title: task.title || "",
      description: task.description || "",
      dueDate: task.dueDate || "",
      priority: task.priority || "Medium",
      notes: task.notes || ""
    });

    setTaskModalOpen(true);
  }

  function saveTask(e) {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    
    const taskData = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      dueDate: taskForm.dueDate,
      priority: taskForm.priority,
      notes: taskForm.notes.trim()
    };

    setBoards(prevBoards => ensureCompletedBoard(prevBoards.map(board => {
      if (board.id !== taskForm.boardId) return board;
      if (taskForm.taskId) {
        return {
          ...board,
          tasks: board.tasks.map(task => task.id === taskForm.taskId ? {
            ...task,
            ...taskData
          } : task)
        };
      }

      const newTask = {
        id: Date.now(),
        ...taskData,
        createdAt: new Date().toLocaleDateString(),
        completed: false,
        completedAt: ""
      };

      return {
        ...board,
        tasks: [...board.tasks, newTask]
      };
    })));

    setTaskModalOpen(false);
  }

  function deleteTask(boardId, taskId) {
    setBoards(prevBoards => ensureCompletedBoard(prevBoards.map(board => board.id === boardId ? {
      ...board,
      tasks: board.tasks.filter(task => task.id !== taskId)
    } : board)));
  }

  function markTaskDone(boardId, taskId) {
    const sourceBoard = boards.find(board => board.id === boardId);
    if (!sourceBoard) return;

    const taskToMove = sourceBoard.tasks.find(task => task.id === taskId);
    if (!taskToMove) return;

    const completedTask = {
      ...taskToMove,
      completed: true,
      completedAt: new Date().toLocaleDateString()
    };

    setBoards(prevBoards => {
      const withoutTask = prevBoards.map(board => {
        if (board.id === boardId) {
          return {
            ...board,
            tasks: board.tasks.filter(task => task.id !== taskId)
          };
        }

        return board;
      });

      return ensureCompletedBoard(withoutTask.map(board => board.isCompletedBoard ? {
        ...board,
        tasks: [...board.tasks, completedTask]
      } : board));
    });
  }

  const allTasks = boards.flatMap(board => board.tasks.map(task => ({
    ...task,
    boardId: board.id,
    boardTitle: board.title,
    status: getTaskStatus(task)
  })));

  const totalBoards = boards.length;
  const totalTasks = allTasks.length;
  const overdueCount = allTasks.filter(task => task.status === "Overdue").length;
  const dueSoonCount = allTasks.filter(task => task.status === "Due Soon").length;
  const onTrackCount = allTasks.filter(task => task.status === "On Track").length;
  const noDueDateCount = allTasks.filter(task => task.status === "No due date").length;
  const invalidDateCount = allTasks.filter(task => task.status === "Invalid date").length;
  const completedCount = allTasks.filter(task => task.status === "Completed").length;
  
  const upcomingTasks = [...allTasks].filter(task => task.dueDate && task.status !== "Invalid date" && task.status !== "Completed").sort((a, b) => {
    const dateDiff = new Date(a.dueDate) - new Date(b.dueDate);
    
    if (dateDiff !== 0) return dateDiff;
    return getPriorityRank(a.priority) - getPriorityRank(b.priority);
  }).slice(0, 5);
  
  return React.createElement("div", null, React.createElement("div", { className: "top-controls"}, 
    React.createElement("div", {className: "stats-panel"}, 
        React.createElement("div", {className: "stat-card stat-boards"}, "Boards: ", totalBoards), 
        React.createElement("div", {className: "stat-card stat-tasks"}, "Tasks: ", totalTasks), 
        React.createElement("div", {className: "stat-card stat-overdue"}, "Overdue: ", overdueCount), 
        React.createElement("div", {className: "stat-card stat-due-soon"}, "Due Soon: ", dueSoonCount), 
        React.createElement("div", {className: "stat-card stat-on-track"}, "On Track: ", onTrackCount), 
        React.createElement("div", {className: "stat-card stat-no-date"}, "No Due Date: ", noDueDateCount), 
        React.createElement("div", {className: "stat-card stat-invalid"}, "Invalid Date: ", invalidDateCount), 
        React.createElement("div", {className: "stat-card stat-completed"}, "Completed: ", completedCount)
    ), 

    React.createElement("div", {className: "tools-panel"}, 
    React.createElement("input", {
        type: "text", 
        placeholder: "Search tasks...", 
        value: searchTerm, 
        onChange: e => setSearchTerm(e.target.value), 
        className: "search-input"
    }), 

    React.createElement("select", {
        value: statusFilter, 
        onChange: e => setStatusFilter(e.target.value), 
        className: "filter-select"
    }, 

    React.createElement("option", {value: "All"}, "All Statuses"), 
    React.createElement("option", {value: "Overdue"}, "Overdue"), 
    React.createElement("option", {value: "Due Soon"}, "Due Soon"), 
    React.createElement("option", {value: "On Track"}, "On Track"), 
    React.createElement("option", {value: "No due date"}, "No due date"), 
    React.createElement("option", {value: "Invalid date"}, "Invalid date"), 
    React.createElement("option", {value: "Completed"}, "Completed")), 

    React.createElement("button", {onClick: openAddBoardModal,className: "main-button"}, "Add Board"))), 
    React.createElement("div", {className: "upcoming-panel"}, 
    React.createElement("h2", null, "Upcoming Tasks"), upcomingTasks.length === 0 ? 
    React.createElement("p", null, "No upcoming tasks yet.") : upcomingTasks.map(task => React.createElement("div", {key: task.id,className: "upcoming-task"}, 
    React.createElement("strong", null, task.title), " \u2014 ", task.boardTitle, 
    React.createElement("br", null), 
    React.createElement("span", null, "Due: ", task.dueDate, " | Priority: ", task.priority)))), 

    React.createElement("div", {className: "boards-container"}, boards.map(board => React.createElement(Board, {
        key: board.id,
        board: board,
        boards: boards,
        setBoards: setBoards,
        draggedTask: draggedTask,
        setDraggedTask: setDraggedTask,
        deleteBoard: deleteBoard,
        openEditBoardModal: openEditBoardModal,
        openAddTaskModal: openAddTaskModal,
        openEditTaskModal: openEditTaskModal,
        deleteTask: deleteTask,
        markTaskDone: markTaskDone,
        getTaskStatus: getTaskStatus,
        searchTerm: searchTerm,
        statusFilter: statusFilter
    }))), 

    boardModalOpen && React.createElement(Modal, {
        title: boardForm.id ? "Edit Board" : "Add Board",
        onClose: () => setBoardModalOpen(false)
    }, 

    React.createElement("form", {
        onSubmit: saveBoard,
        className: "modal-form"
    }, 

    React.createElement("label", null, "Board Name"), 
    React.createElement("input", {
        type: "text",
        value: boardForm.title,
        onChange: e => setBoardForm({
        ...boardForm,
        title: e.target.value
        }),
        required: true
    }), 
    
    React.createElement("label", null, "Board Color"), 

    React.createElement("div", {className: "color-options"}, 
        BOARD_COLORS.map(color => 
            React.createElement("button", {
                type: "button",
                key: color,
                className: `color-circle ${boardForm.color === color ? "selected-color" : ""}`,
                style: {backgroundColor: color},
                onClick: () => setBoardForm({
                    ...boardForm,
                    color
                })
            })
        )
    ), 
  
    React.createElement("div", {
        className: "modal-buttons"
    }, 
    
    React.createElement("button", {
        type: "submit"}, 
        boardForm.id ? "Save Board" : "Create Board"), 
        React.createElement("button", {
            type: "button",
            className: "secondary-button",
            onClick: () => setBoardModalOpen(false)
        }, 
        "Cancel")
    ))), 

    taskModalOpen && React.createElement(Modal, 
        {
            title: taskForm.taskId ? "Edit Task" : "Add Task",
            onClose: () => setTaskModalOpen(false)
        }, 
        
        React.createElement("form", {
            onSubmit: saveTask,
            className: "modal-form"
        }, 
        
        React.createElement("label", null, "Task Title"), 
        
        React.createElement("input", {
            type: "text",
            value: taskForm.title,
            onChange: e => setTaskForm({
                ...taskForm,
                title: e.target.value
            }),
            required: true
        }), 
        
        React.createElement("label", null, "Description"), React.createElement("textarea", {
            rows: "3",
            value: taskForm.description,
            onChange: e => setTaskForm({
                ...taskForm,
                description: e.target.value
            })
        }), 
        
        React.createElement("label", null, "Due Date"), 
        
        React.createElement("input", {
            type: "date",
            value: taskForm.dueDate,
            onChange: e => setTaskForm({
                ...taskForm,
                dueDate: e.target.value
            })
        }), 
        
        React.createElement("label", null, "Priority"), 
        
        React.createElement("div", 
            {
                className: "priority-picker"
            }, 

            ["High", "Medium", "Low"].map(priority => React.createElement("button", {
                key: priority,
                type: "button",
                className: `priority-option ${getPriorityClass(priority)} ${taskForm.priority === priority ? "selected-priority" : ""}`,
                onClick: () => setTaskForm({
                    ...taskForm,
                    priority
                })
            }, priority))
        ), 
        
        React.createElement("label", null, "Notes"), 
        React.createElement("textarea", {
            rows: "3",
            value: taskForm.notes,
            onChange: e => setTaskForm({
                ...taskForm,
                notes: e.target.value
            })
        }), 
            
            React.createElement("div", {className: "modal-buttons"}, 
                React.createElement("button", {
                    type: "submit"}, 
                    taskForm.taskId ? "Save Task" : "Create Task"
                ), 
                
                React.createElement("button", {
                    type: "button",
                    className: "secondary-button",
                    onClick: () => setTaskModalOpen(false)
                }, "Cancel")
            )
        )
    ));
};

const Board = ({
    board,
    boards,
    setBoards,
    draggedTask,
    setDraggedTask,
    deleteBoard,
    openEditBoardModal,
    openAddTaskModal,
    openEditTaskModal,
    deleteTask,
    markTaskDone,
    getTaskStatus,
    searchTerm,
    statusFilter
}) => {
    const [expandedTaskId, setExpandedTaskId] = React.useState(null);
  
    function handleDrop(targetBoardId, targetTaskId = null) {
        if (!draggedTask) return;
        
        const {
        taskId,
        sourceBoardId
        } = draggedTask;

        const sourceBoard = boards.find(b => b.id === sourceBoardId);
        const targetBoard = boards.find(b => b.id === targetBoardId);

        if (!sourceBoard || !targetBoard) return;
        const movedTask = sourceBoard.tasks.find(t => t.id === taskId);

        if (!movedTask) return;

        if (sourceBoardId === targetBoardId) {
        const updatedBoards = boards.map(b => {
            if (b.id !== sourceBoardId) return b;
            
            const taskList = [...b.tasks];
            const fromIndex = taskList.findIndex(t => t.id === taskId);
            const toIndex = targetTaskId === null ? taskList.length - 1 : taskList.findIndex(t => t.id === targetTaskId);
            
            if (fromIndex === -1 || toIndex === -1) return b;
            const [removedTask] = taskList.splice(fromIndex, 1);
            
            taskList.splice(toIndex, 0, removedTask);
            return {
            ...b,
            tasks: taskList
            };
        });

        setBoards(ensureCompletedBoard(updatedBoards));
        setDraggedTask(null);
        return;
        }

        const updatedMovedTask = targetBoard.isCompletedBoard ? {
        ...movedTask,
        completed: true,
        completedAt: new Date().toLocaleDateString()
        } : {
        ...movedTask,
        completed: false,
        completedAt: ""
        };

        const boardsWithoutTask = boards.map(b => {
        if (b.id === sourceBoardId) {
            return {
            ...b,
            tasks: b.tasks.filter(t => t.id !== taskId)
            };
        }
        return b;
        });

        const updatedBoards = boardsWithoutTask.map(b => {
        if (b.id !== targetBoardId) return b;
        const newTasks = [...b.tasks];
        if (targetTaskId === null) {
            newTasks.push(updatedMovedTask);
        } else {
            const targetIndex = newTasks.findIndex(t => t.id === targetTaskId);
            if (targetIndex === -1) {
            newTasks.push(updatedMovedTask);
            } else {
            newTasks.splice(targetIndex, 0, updatedMovedTask);
            }
        }
        return {
            ...b,
            tasks: newTasks
        };
        });

        setBoards(ensureCompletedBoard(updatedBoards));
        setDraggedTask(null);
    }

    const filteredTasks = board.tasks.filter(task => {
        const taskStatus = getTaskStatus(task);
        const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || task.description.toLowerCase().includes(searchTerm.toLowerCase()) || (task.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "All" ? true : taskStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });

    function toggleTask(taskId) {
        setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    }

    return React.createElement("div", {
        className: "board",
        style: {backgroundColor: board.color || "#eef1f7"},
        onDragOver: e => e.preventDefault(),
        onDrop: () => handleDrop(board.id)
    },
        
    React.createElement("div", {className: "board-header"},
        React.createElement("h2", null, board.title), 
        React.createElement("div", {className: "board-buttons"}, !board.isCompletedBoard && 
            React.createElement(React.Fragment, null, React.createElement("button", {onClick: () => openEditBoardModal(board)}, "Edit Board"),
            React.createElement("button", {onClick: () => deleteBoard(board.id)}, "Delete Board")))
    ), 
            React.createElement("div", {className: "task-list"}, filteredTasks.length === 0 ? 
                React.createElement("p", {className: "empty-message"}, "No matching tasks.") : filteredTasks.map(task => {
                    const status = getTaskStatus(task);
                    const isExpanded = expandedTaskId === task.id;
                    const taskCardClass = status === "Completed" ? "task-completed" : status === "Overdue" ? "task-overdue" : status === "Due Soon" ? "task-due-soon" : status === "On Track" ? "task-on-track" : "task-no-date";
                    
                    return React.createElement("div", {
                        key: task.id,
                        className: `task-card ${taskCardClass}`,
                        draggable: true,
                        onDragStart: () => setDraggedTask({
                            taskId: task.id,
                            sourceBoardId: board.id
                        }),
                        onDragOver: e => e.preventDefault(),
                        onDrop: e => {
                            e.stopPropagation(); 
                            handleDrop(board.id, task.id);
                        }
                    }, 

                    React.createElement("div", {
                        className: "task-top",
                        onClick: () => toggleTask(task.id)
                    }, 

                    React.createElement("div", {className: "task-title-row"}, 
                        React.createElement("span", {className: `priority-dot ${getPriorityClass(task.priority)}`}), 
                        React.createElement("h3", null, task.title)
                    ),
                    React.createElement("span", {className: "expand-text"}, isExpanded ? "Hide" : "View")), isExpanded && 

                    React.createElement("div", {className: "task-details"},
                        React.createElement("p", null, task.description || "No description"), 
                        React.createElement("p", null,React.createElement("strong", null, "Created:"), " ", task.createdAt), 
                        React.createElement("p", null, React.createElement("strong", null, "Due:"), " ", task.dueDate || "No due date"), 
                        task.completedAt && 
                        React.createElement("p", null, React.createElement("strong", null, "Completed:"), " ", task.completedAt), 

                        React.createElement("p", null, React.createElement("strong", null, "Status:"), " ", 
                            React.createElement("span", {className: `status-badge ${getStatusClass(status)}`}, status)
                        ), 

                        React.createElement("p", null, React.createElement("strong", null, "Priority:"), " ", 
                            React.createElement("span", {className: `priority-badge ${getPriorityClass(task.priority)}`}, task.priority || "Low")
                        ), 

                        React.createElement("p", null, React.createElement("strong", null, "Notes:"), " ", task.notes || "No notes"),
                        React.createElement("div", {className: "task-buttons"}, !board.isCompletedBoard && 
                            React.createElement(React.Fragment, null, 
                                React.createElement("button", {onClick: () => openEditTaskModal(board.id, task.id)}, "Edit"), 
                                React.createElement("button", {onClick: () => markTaskDone(board.id, task.id)}, "Done")
                            ), 
                            
                            React.createElement("button", {onClick: () => deleteTask(board.id, task.id)}, "Delete")
                        )
                    ));
                })
            ), !board.isCompletedBoard && 
            React.createElement("button", {className: "add-task-bottom",onClick: () => openAddTaskModal(board.id)}, "Add Task")
        );
};

const Modal = ({
    title,
    children,
    onClose
}) => {
    return React.createElement("div", {className: "modal-overlay"}, 
        React.createElement("div", {className: "modal-box"}, 
            React.createElement("div", {className: "modal-header"}, 
                React.createElement("h2", null, title), 
                React.createElement("button", {
                    className: "close-button",
                    onClick: onClose
                }, "\u2715")
            ), children
        )
    );
};

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));