/* ==========================================================================
   Longtom Trails Conservancy — script.js
   Handles: mobile nav toggle, trails difficulty filter, basic form validation
   ========================================================================== */

// ---- Mobile navigation toggle ---------------------------------------------
// The nav toggle button (.nav-toggle) and nav menu (.main-nav) appear in the
// shared header on every page. On click, we toggle the .is-open class on
// the nav — CSS then shows or hides it based on that class (see the mobile
// breakpoint in styles.css). We also update aria-expanded so screen readers
// announce whether the menu is currently open or closed.
document.addEventListener("DOMContentLoaded", function () {
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }

    // ---- Trails page: difficulty filter -------------------------------------
  // Only runs if filter buttons exist on the current page (trails.html) —
  // on other pages, filterButtons.length is 0 and this block is skipped.
  // Each filter button has a data-filter attribute (e.g. "easy", "hard",
  // or "all"). When clicked, we compare that value against each trail
  // card's own data-difficulty attribute: matching cards are shown
  // (style.display = ""), non-matching cards are hidden (display = "none").
  var filterButtons = document.querySelectorAll(".filter-btn");
  var trailCards = document.querySelectorAll("[data-difficulty]");

  if (filterButtons.length && trailCards.length) {
    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var selected = button.getAttribute("data-filter");

        // Update active button styling
        filterButtons.forEach(function (b) {
          b.classList.remove("is-active");
        });
        button.classList.add("is-active");

        // Show only trail cards matching the selected difficulty
        trailCards.forEach(function (card) {
          var matches = selected === "all" || card.getAttribute("data-difficulty") === selected;
          card.style.display = matches ? "" : "none";
        });
      });
    });
  }

    // ---- Enquiry / Contact forms: simple required-field validation ---------
  // Targets any <form data-validate> on the page (the volunteer form,
  // On submit, we loop through every field marked [required] inside that
  // form. If a field is empty, we add the .field-invalid class to its
  // wrapping .form-field div — CSS then reveals that field's error message
  // and gives it a red border (see the form-error rules in styles.css).
  // If ANY required field is empty, event.preventDefault() stops the form
  // from actually submitting, so the user sees the errors instead.
  var forms = document.querySelectorAll("form[data-validate]");

  forms.forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var isValid = true;
      var requiredFields = form.querySelectorAll("[required]");

      requiredFields.forEach(function (field) {
        var wrapper = field.closest(".form-field");
        var filled = field.value.trim().length > 0;

        if (wrapper) {
          wrapper.classList.toggle("field-invalid", !filled);
        }
        if (!filled) {
          isValid = false;
        }
      });

      if (!isValid) {
        event.preventDefault();
      }
    });
  });
});