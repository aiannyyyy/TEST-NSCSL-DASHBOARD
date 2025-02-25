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

(function($) {
  'use strict';
  $(function() {
    var todoListItem = $('.todo-list'); 
    var todoListInput = $('#todoInput'); 
    var todoDateInput = $('#todoDate'); 

    // Function to calculate status
    function getStatusBadge(dueDate) {
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

    // Add task when clicking the save button in the modal
    $('#saveTodo').on("click", function(event) {
      event.preventDefault();

      var taskText = todoListInput.val().trim();
      var taskDate = todoDateInput.val();
      
      if (taskText === "") {
        alert("Please enter a task!");
        return;
      }

      let dueDateText = taskDate ? new Date(taskDate).toLocaleDateString() : "No due date";
      let statusBadge = getStatusBadge(taskDate);

      // Append new item to the list
      todoListItem.append(`
        <li class="d-block">
          <div class="form-check w-100">
            <label class="form-check-label">
              <input class="checkbox" type="checkbox"/> ${taskText} <i class="input-helper rounded"></i>
            </label>
            <div class="d-flex mt-2">
              <div class="ps-4 text-small me-3">${dueDateText}</div>
              ${statusBadge}
              <i class="remove ti-close ms-2 text-danger cursor-pointer"></i>
            </div>
          </div>
        </li>
      `);

      // Clear input fields after adding a task
      todoListInput.val("");
      todoDateInput.val("");

      // Close modal after adding a task
      let todoModal = bootstrap.Modal.getInstance(document.getElementById('todoModal'));
      todoModal.hide();
    });

    // Toggle completed state when checkbox is clicked
    todoListItem.on('change', '.checkbox', function() {
      let parentLi = $(this).closest("li");
      let badge = parentLi.find(".badge");

      if ($(this).is(":checked")) {
        parentLi.addClass('completed');
        badge.removeClass("badge-opacity-warning badge-opacity-danger badge-opacity-info")
             .addClass("badge-opacity-success")
             .text("Completed");
      } else {
        parentLi.removeClass('completed');
        let dueDateText = parentLi.find(".text-small").text();
        let newBadge = getStatusBadge(dueDateText);
        badge.replaceWith(newBadge);
      }
    });

    // Remove task when clicking the close (X) button
    todoListItem.on('click', '.remove', function() {
      $(this).closest('li').remove();
    });

  });
})(jQuery);

