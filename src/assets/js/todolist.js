//(function($) {
//  'use strict';
//  $(function() {
//    var todoListItem = $('.todo-list');
//    var todoListInput = $('.todo-list-input');
//    $('.todo-list-add-btn').on("click", function(event) {
//      event.preventDefault();

//      var item = $(this).prevAll('.todo-list-input').val();

//      if (item) {
//        todoListItem.append("<li><div class='form-check'><label class='form-check-label'><input class='checkbox' type='checkbox'/>" + item + "<i class='input-helper'></i></label></div><i class='remove ti-close'></i></li>");
//   todoListInput.val("");
//      }

//    });

//    todoListItem.on('change', '.checkbox', function() {
//      if ($(this).attr('checked')) {
//        $(this).removeAttr('checked');
//      } else {
//        $(this).attr('checked', 'checked');
//      }

//      $(this).closest("li").toggleClass('completed');

//    });

//    todoListItem.on('click', '.remove', function() {
//      $(this).parent().remove();
//    });

//  });
//})(jQuery);

(function ($) {
  'use strict';
  $(function () {
    var todoListItem = $('.todo-list');
    var todoListInput = $('#todoInput');
    var todoDateInput = $('#todoDate');

    // ✅ Load stored tasks on page load
    loadTasks();

    // 📌 Function to get status badge
    function getStatusBadge(dueDate, completed) {
      if (completed) {
        return '<div class="badge badge-opacity-success me-3">Completed</div>';
      }
      if (!dueDate) return '<div class="badge badge-opacity-info me-3">Pending</div>';

      let today = new Date();
      let due = new Date(dueDate);
      let timeDiff = (due - today) / (1000 * 60 * 60 * 24); // Difference in days

      if (timeDiff < 0) {
        return '<div class="badge badge-opacity-danger me-3">Overdue</div>'; // Red
      } else if (timeDiff < 1) {
        return '<div class="badge badge-opacity-warning me-3">Due Tomorrow</div>'; // Yellow
      } else {
        return '<div class="badge badge-opacity-info me-3">Pending</div>'; // Blue
      }
    }

    // 📌 Function to save tasks to localStorage
    function saveTasks(tasks) {
      localStorage.setItem('todoTasks', JSON.stringify(tasks));
    }

    // 📌 Function to load tasks from localStorage
    function loadTasks() {
      let tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
      todoListItem.html(""); // Clear list before loading

      tasks.forEach(task => {
        let statusBadge = getStatusBadge(task.dueDate, task.completed);
        let checked = task.completed ? "checked" : "";

        todoListItem.append(`
          <li class="d-block ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="form-check w-100">
              <label class="form-check-label">
                <input class="checkbox" type="checkbox" ${checked}/> ${task.text} <i class="input-helper rounded"></i>
              </label>
              <div class="d-flex mt-2">
                <div class="ps-4 text-small me-3">${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"}</div>
                ${statusBadge}
                <i class="remove ti-close ms-2 text-danger cursor-pointer"></i>
              </div>
            </div>
          </li>
        `);
      });
    }

    // 📌 Add task when clicking the save button in the modal
    $('#saveTodo').on("click", function (event) {
      event.preventDefault();

      var taskText = todoListInput.val().trim();
      var taskDate = todoDateInput.val();

      if (taskText === "") {
        alert("Please enter a task!");
        return;
      }

      let tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];
      let newTask = {
        id: Date.now(),
        text: taskText,
        dueDate: taskDate,
        completed: false
      };

      tasks.push(newTask);
      saveTasks(tasks);
      loadTasks(); // Refresh list

      // Clear input fields
      todoListInput.val("");
      todoDateInput.val("");

      // Close modal
      let todoModal = bootstrap.Modal.getInstance(document.getElementById('todoModal'));
      todoModal.hide();
    });

    // 📌 Toggle completed state when checkbox is clicked
    todoListItem.on('change', '.checkbox', function () {
      let parentLi = $(this).closest("li");
      let taskId = parentLi.data("id");
      let tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];

      let task = tasks.find(t => t.id == taskId);
      task.completed = !task.completed;
      saveTasks(tasks);
      loadTasks(); // Refresh list
    });

    // 📌 Remove task when clicking the close (X) button
    todoListItem.on('click', '.remove', function () {
      let parentLi = $(this).closest("li");
      let taskId = parentLi.data("id");
      let tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];

      tasks = tasks.filter(t => t.id != taskId);
      saveTasks(tasks);
      loadTasks(); // Refresh list
    });

  });
})(jQuery);


