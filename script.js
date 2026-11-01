/* ==========================================================================
   Longtom Trails Conservancy — script.js
   This file handles:
   1. The mobile navigation toggle
   2. The difficulty filter on the Trails page
   3. Form validation, AJAX submission and responses (Enquiry + Contact pages)
   ========================================================================== */

// The email address general messages are sent to (used by the Contact form).
// Stated here in the code so it can be changed in one place.
const CONTACT_RECIPIENT = "info@longtomtrails.org.za";

// Maximum number of volunteers per monthly clean-up hike.
const CLEAN_UP_CAPACITY = 20;

// Sponsorship packages offered on the Enquiry page. The keys match the
// <option value="..."> attributes in the sponsor form's package dropdown.
// On a real site this data would come from a database; it is stored here
// because the site has no back end.
const SPONSOR_PACKAGES = {
  "trail-marker": {
    name: "Trail Marker Sponsor",
    cost: 1500,
    slotsTotal: 10,
    slotsLeft: 7,
    benefits: "Funds new route markers for one trail and places your logo on our Trails page."
  },
  "trail-care": {
    name: "Trail Care Sponsor",
    cost: 5000,
    slotsTotal: 6,
    slotsLeft: 4,
    benefits: "Covers tools and supplies for a full season of clean-up hikes, with your logo on the website and our social media."
  },
  "trail-champion": {
    name: "Trail Champion",
    cost: 15000,
    slotsTotal: 3,
    slotsLeft: 2,
    benefits: "Funds a year of maintenance for one trail, with your name on its map and at our events."
  }
};

// Run the setup functions once the page's HTML has finished loading.
document.addEventListener("DOMContentLoaded", function () {
  setupNavigation();
  setupTrailFilter();
  setupForms();
});

/* ---- 1. Mobile navigation toggle ------------------------------------------
   The nav toggle button (.nav-toggle) and nav menu (.main-nav) appear in the
   shared header on every page. On click, we toggle the .is-open class on the
   nav, and CSS then shows or hides it (see the mobile breakpoint in
   styles.css). We also update aria-expanded so screen readers announce
   whether the menu is open or closed. */
function setupNavigation() {
  var navToggle = document.querySelector(".nav-toggle");
  var mainNav = document.querySelector(".main-nav");

  if (navToggle && mainNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = mainNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
  }
}

/* ---- 2. Trails page: difficulty filter ------------------------------------
   Only runs if filter buttons exist on the current page (trails.html). On
   other pages filterButtons.length is 0 and this function does nothing.
   Each filter button has a data-filter attribute ("easy", "hard" or "all").
   When clicked, we compare it with each trail card's data-difficulty
   attribute: matching cards are shown, the rest are hidden. */
function setupTrailFilter() {
  var filterButtons = document.querySelectorAll(".filter-btn");
  var trailCards = document.querySelectorAll("[data-difficulty]");

  if (!filterButtons.length || !trailCards.length) {
    return;
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var selected = button.getAttribute("data-filter");

      filterButtons.forEach(function (b) {
        b.classList.remove("is-active");
      });
      button.classList.add("is-active");

      trailCards.forEach(function (card) {
        var matches = selected === "all" || card.getAttribute("data-difficulty") === selected;
        card.style.display = matches ? "" : "none";
      });
    });
  });
}

/* ---- 3. Forms --------------------------------------------------------------
   Every <form data-form="..."> on the site is set up here. The forms have the
   "novalidate" attribute, so the browser's own pop-up messages are switched
   off and JavaScript checks every field and shows our own error messages.
   The HTML5 attributes (required, pattern, minlength, maxlength, min, max)
   are still on the fields, and the JavaScript reads them to decide what is
   valid, so the rules live in one place: the HTML. */
function setupForms() {
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    setupDateLimits(form);
    setupCharacterCounters(form);

    form.querySelectorAll("input, select, textarea").forEach(function (field) {
      // Check a field when the user leaves it...
      field.addEventListener("blur", function () {
        validateField(field);
      });
      // ...and re-check while they type, but only once an error is showing,
      // so the message disappears as soon as they fix the problem.
      field.addEventListener("input", function () {
        if (field.closest(".form-field").classList.contains("field-invalid")) {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      // Stop the browser from reloading the page; we handle submission ourselves.
      event.preventDefault();

      if (!validateForm(form)) {
        return; // errors are already showing, so do nothing else
      }

      var handler = FORM_HANDLERS[form.dataset.form];
      if (handler) {
        handler(form);
      }
    });
  });
}

/* Sets the earliest and latest dates a date field accepts, based on its
   data-date-range="minDays,maxDays" attribute (days from today). */
function setupDateLimits(form) {
  form.querySelectorAll("input[data-date-range]").forEach(function (input) {
    var range = input.dataset.dateRange.split(",");
    var today = new Date();
    var earliest = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Number(range[0]));
    var latest = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Number(range[1]));
    input.min = toDateInputValue(earliest);
    input.max = toDateInputValue(latest);
  });
}

/* Shows a live "12 / 300" counter under every textarea that has a maxlength. */
function setupCharacterCounters(form) {
  form.querySelectorAll("textarea[maxlength]").forEach(function (textarea) {
    var counter = textarea.closest(".form-field").querySelector(".char-counter");
    if (!counter) {
      return;
    }

    var update = function () {
      counter.textContent = textarea.value.length + " / " + textarea.maxLength;
    };

    textarea.addEventListener("input", update);
    // The reset event fires before the values are cleared, so wait a moment.
    form.addEventListener("reset", function () {
      setTimeout(update, 0);
    });
    update();
  });
}

/* Checks every field in a form. Returns true only if all of them are valid.
   If something is wrong, the first problem field is focused so the user (and
   screen readers) land on it straight away. */
function validateForm(form) {
  var firstInvalid = null;

  form.querySelectorAll("input, select, textarea").forEach(function (field) {
    var isValid = validateField(field);
    if (!isValid && !firstInvalid) {
      firstInvalid = field;
    }
  });

  if (firstInvalid) {
    firstInvalid.focus();
  }
  return firstInvalid === null;
}

/* Checks one field and shows or clears its error message. The red border and
   visible message come from the .field-invalid class (see styles.css). */
function validateField(field) {
  var wrapper = field.closest(".form-field");
  var errorBox = wrapper.querySelector(".form-error");
  var message = getFieldError(field);

  wrapper.classList.toggle("field-invalid", message !== "");
  field.setAttribute("aria-invalid", message !== "" ? "true" : "false");
  errorBox.textContent = message;

  return message === "";
}

/* Works out what, if anything, is wrong with a field. Returns an error
   message, or an empty string if the field is valid. The checks run in order,
   so the user only ever sees the first problem. */
function getFieldError(field) {
  var value = field.value.trim();
  var label = field.dataset.label || "This field";

  // A date the browser could not understand (e.g. half-typed).
  if (field.type === "date" && value === "" && field.validity.badInput) {
    return "Please enter a valid date.";
  }

  // Required fields must not be empty (or only spaces).
  if (field.required && value === "") {
    return label + " is required.";
  }

  // An optional field left empty is fine, so skip the other checks.
  if (value === "") {
    return "";
  }

  // Email format: something@something.something
  if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
    return "Please enter a valid email address, for example name@example.com.";
  }

  // Format check (e.g. phone numbers) using the field's pattern attribute.
  // The ^ and $ make the whole value match, not just part of it.
  if (field.pattern && !new RegExp("^(?:" + field.pattern + ")$").test(value)) {
    return field.dataset.patternMessage || label + " is not in the correct format.";
  }

  // Character length limits.
  if (field.minLength > 0 && value.length < field.minLength) {
    return label + " must be at least " + field.minLength + " characters (you have typed " + value.length + ").";
  }
  if (field.maxLength > 0 && value.length > field.maxLength) {
    return label + " must be no more than " + field.maxLength + " characters.";
  }

  // Date limits. Dates in YYYY-MM-DD format can be compared as plain text.
  if (field.type === "date") {
    if ((field.min && value < field.min) || (field.max && value > field.max)) {
      return field.dataset.rangeMessage || "Please choose a date within the allowed range.";
    }
  }

  return "";
}

/* ---- Form handlers ---------------------------------------------------------
   These run only after a form has passed validation. Each one is matched to a
   form through its data-form attribute. */
var FORM_HANDLERS = {
  volunteer: function (form) {
    sendEnquiry(form, buildVolunteerResponse(form));
  },
  sponsor: function (form) {
    sendEnquiry(form, buildSponsorResponse(form));
  }
};

/* Sends a valid enquiry in the background (AJAX) so the page does not reload,
   then shows the response. While sending, the button is disabled so the form
   cannot be submitted twice. */
async function sendEnquiry(form, response) {
  var button = form.querySelector("button[type='submit']");
  var originalText = button.textContent;
  var responseBox = document.getElementById(form.dataset.response);

  button.disabled = true;
  button.textContent = "Sending...";
  responseBox.hidden = true;

  try {
    await submitWithAjax(form);
    showResponse(responseBox, response, false);
    form.reset();
  } catch (error) {
    showResponse(responseBox, {
      title: "We could not send your enquiry",
      lines: [
        "Please check your internet connection and try again.",
        "You can also email us directly at " + CONTACT_RECIPIENT + "."
      ]
    }, true);
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

/* AJAX submission: sends the form data to the form's action URL with fetch(),
   without leaving the page.
   While the action still contains the placeholder YOUR_FORM_ID, no real
   service is connected yet, so a short delay stands in for the network
   request. Replace YOUR_FORM_ID with a real Formspree form ID to send real
   submissions. */
async function submitWithAjax(form) {
  var endpoint = form.getAttribute("action");

  if (endpoint.indexOf("YOUR_FORM_ID") !== -1) {
    await new Promise(function (resolve) {
      setTimeout(resolve, 900);
    });
    return;
  }

  var result = await fetch(endpoint, {
    method: "POST",
    body: new FormData(form),
    headers: { Accept: "application/json" }
  });

  if (!result.ok) {
    throw new Error("The server responded with status " + result.status);
  }
}

/* Builds the volunteer's response. It tells them the date of the next
   clean-up hike on or after the day they chose, and how many spots are left. */
function buildVolunteerResponse(form) {
  var firstName = form.elements.name.value.trim().split(" ")[0];
  var email = form.elements.email.value.trim();
  var chosenDate = new Date(form.elements.date.value + "T00:00:00");
  var availability = form.elements.availability.selectedOptions[0].text;

  var hikeDate = getNextCleanUpDate(chosenDate);
  var hikeText = hikeDate.toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  });

  // Demo availability: a number between 4 and 14 worked out from the date, so
  // the same date always gives the same answer. A real site would read the
  // booking count from a database.
  var taken = 6 + (hikeDate.getDate() * 7 + hikeDate.getMonth() * 3) % 11;
  var spotsLeft = CLEAN_UP_CAPACITY - taken;

  return {
    title: "Thank you, " + firstName + "!",
    lines: [
      "Your volunteer registration has been received. We will confirm by email at " + email + ".",
      "Next clean-up hike: " + hikeText + " at 07:30 (first Saturday of every month).",
      "Spots remaining: " + spotsLeft + " of " + CLEAN_UP_CAPACITY + ".",
      "Meeting point: Lydenburg Trailhead Office. Volunteering is free. Bring water, sun protection and sturdy shoes.",
      "Your availability (" + availability.toLowerCase() + ") has been noted."
    ]
  };
}

/* Clean-up hikes happen on the first Saturday of each month. This returns the
   first one on or after the given date. */
function getNextCleanUpDate(fromDate) {
  var hike = getFirstSaturday(fromDate.getFullYear(), fromDate.getMonth());
  if (hike < fromDate) {
    // This month's hike has already passed, so use next month's.
    hike = getFirstSaturday(fromDate.getFullYear(), fromDate.getMonth() + 1);
  }
  return hike;
}

function getFirstSaturday(year, month) {
  var firstOfMonth = new Date(year, month, 1);
  // getDay() gives 0 for Sunday up to 6 for Saturday.
  var daysUntilSaturday = (6 - firstOfMonth.getDay() + 7) % 7;
  return new Date(year, month, 1 + daysUntilSaturday);
}

/* Builds the sponsor's response: the cost of the package they chose, how they
   would pay, and how many places are left for the year. */
function buildSponsorResponse(form) {
  var organisation = form.elements.organisation.value.trim();
  var contact = form.elements.contact.value.trim();
  var email = form.elements.email.value.trim();
  var pack = SPONSOR_PACKAGES[form.elements.package.value];
  var isMonthly = form.elements.payment.value === "monthly";

  var paymentLine;
  if (isMonthly) {
    var instalment = Math.ceil(pack.cost / 12);
    paymentLine = "Cost: " + formatRand(pack.cost) + " per year, paid in 12 monthly instalments of " + formatRand(instalment) + ".";
  } else {
    paymentLine = "Cost: " + formatRand(pack.cost) + ", paid once-off.";
  }

  return {
    title: "Thank you, " + organisation + "!",
    lines: [
      "Package: " + pack.name + ".",
      paymentLine,
      "What it covers: " + pack.benefits,
      "Availability: " + pack.slotsLeft + " of " + pack.slotsTotal + " " + pack.name + " places are still open this year.",
      "Our sponsorship coordinator will contact " + contact + " at " + email + " within 2 working days."
    ]
  };
}

/* ---- Small helper functions ---------------------------------------------- */

/* Displays a response in a box: a heading, then a list of lines. The text is
   added with textContent (not innerHTML), so anything a visitor typed is shown
   as plain text and can never run as code. */
function showResponse(box, response, isError) {
  box.innerHTML = "";

  var heading = document.createElement("h3");
  heading.textContent = response.title;
  box.appendChild(heading);

  var list = document.createElement("ul");
  response.lines.forEach(function (line) {
    var item = document.createElement("li");
    item.textContent = line;
    list.appendChild(item);
  });
  box.appendChild(list);

  box.classList.toggle("is-error", isError);
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* 1500 becomes "R1,500". */
function formatRand(amount) {
  return "R" + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/* Turns a Date into the YYYY-MM-DD text a date input needs. */
function toDateInputValue(date) {
  var month = String(date.getMonth() + 1).padStart(2, "0");
  var day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

/* ---- Contact form -----------------------------------------------------------
   The Contact form does not post to a server. Once it passes validation, the
   details are compiled into an email and shown as a preview. The visitor then
   clicks a button that opens their own email app with everything filled in,
   addressed to CONTACT_RECIPIENT (set at the top of this file).
   FORM_HANDLERS is looked up when a form is submitted, so adding the contact
   handler here, after the object was created, works the same as writing it
   inside the object. */
FORM_HANDLERS.contact = function (form) {
  var email = compileContactEmail(form);
  showEmailPreview(document.getElementById(form.dataset.response), email);
};

/* Collects the validated form values and builds the email: who it is to, the
   subject line, the body text, and a mailto: link that opens an email app. */
function compileContactEmail(form) {
  var name = form.elements.name.value.trim();
  var senderEmail = form.elements.email.value.trim();
  var phone = form.elements.phone.value.trim() || "Not provided";
  var messageType = form.elements.messageType.selectedOptions[0].text;
  var message = form.elements.message.value.trim();

  var subject = messageType + " - message from " + name;

  var body = [
    "Hello Longtom Trails Conservancy,",
    "",
    "Message type: " + messageType,
    "Name: " + name,
    "Email: " + senderEmail,
    "Phone: " + phone,
    "",
    "Message:",
    message,
    "",
    "Kind regards,",
    name
  ].join("\n");

  // encodeURIComponent makes the text safe to put inside a link. Email apps
  // expect line breaks as \r\n, so those are swapped in first.
  var link = "mailto:" + CONTACT_RECIPIENT +
    "?subject=" + encodeURIComponent(subject) +
    "&body=" + encodeURIComponent(body.replace(/\n/g, "\r\n"));

  return { to: CONTACT_RECIPIENT, subject: subject, body: body, link: link };
}

/* Shows the compiled email in a preview box with two buttons: one that opens
   it in the visitor's email app, and one that copies the text. Everything is
   added with textContent, so nothing the visitor typed can run as code. */
function showEmailPreview(box, email) {
  box.innerHTML = "";

  var heading = document.createElement("h3");
  heading.textContent = "Your email is ready to send";
  box.appendChild(heading);

  var intro = document.createElement("p");
  intro.textContent = "Check the email below. When you are happy with it, click the button to open it in your email app, then press Send there. To change something, edit the form above and submit it again.";
  box.appendChild(intro);

  var preview = document.createElement("pre");
  preview.className = "email-preview";
  preview.textContent = "To: " + email.to + "\nSubject: " + email.subject + "\n\n" + email.body;
  box.appendChild(preview);

  var actions = document.createElement("div");
  actions.className = "response-actions";

  var sendLink = document.createElement("a");
  sendLink.className = "btn btn-primary";
  sendLink.href = email.link;
  sendLink.textContent = "Open in my email app";
  actions.appendChild(sendLink);

  var copyButton = document.createElement("button");
  copyButton.type = "button";
  copyButton.className = "btn btn-outline-dark";
  copyButton.textContent = "Copy email text";
  copyButton.addEventListener("click", function () {
    if (!navigator.clipboard) {
      copyButton.textContent = "Copying is not available. Select the text above instead.";
      return;
    }
    navigator.clipboard.writeText(preview.textContent).then(function () {
      copyButton.textContent = "Copied!";
    }, function () {
      copyButton.textContent = "Copy failed. Select the text above instead.";
    });
  });
  actions.appendChild(copyButton);
  box.appendChild(actions);

  box.classList.remove("is-error");
  box.hidden = false;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---- Scroll-reveal animation -------------------------------------------------
   Every .section on every page fades in and slides up as it scrolls into view.
   The IntersectionObserver reports when an element enters the screen; we then
   add the is-visible class and CSS (see .reveal in styles.css) animates the
   change with a transition. The .reveal class is added by JavaScript, not
   written in the HTML, so if JavaScript is off nothing is ever hidden.
   People who have asked their device to reduce motion do not get the animation. */
function setupScrollReveal() {
  var sections = document.querySelectorAll(".section");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || reducedMotion) {
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        // Each section only needs to animate once.
        observer.unobserve(entry.target);
      }
    });
  }, {
    // Trigger as soon as any part of a section is 60px inside the screen.
    // (A percentage threshold could fail on very tall sections.)
    threshold: 0,
    rootMargin: "0px 0px -60px 0px"
  });

  sections.forEach(function (section) {
    section.classList.add("reveal");
    observer.observe(section);
  });
}

document.addEventListener("DOMContentLoaded", setupScrollReveal);

/* ==========================================================================
   Interactive elements (About page):
   1. A modal window that shows a team member's bio
   2. A photo gallery with a lightbox (a full-size photo viewer)
   3. A FAQ accordion, built with jQuery
   Every function checks that its elements exist first, so on pages without
   them (all the other pages) nothing happens.
   The modal and the lightbox use the HTML <dialog> element. When a dialog is
   opened with showModal(), the browser draws the dark backdrop, keeps keyboard
   focus inside the window, closes it when Esc is pressed and returns focus to
   the button that opened it, so very little code is needed.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function () {
  setupBioModal();
  setupGallery();
});

// The accordion uses jQuery. This only runs if jQuery loaded; if it did not,
// the FAQ answers simply stay visible, so nothing is lost.
if (window.jQuery) {
  jQuery(function ($) {
    setupAccordion($);
  });
}

/* ---- Shared helpers for the two dialogs ----------------------------------- */

// Older browsers do not have <dialog>. In that case the modal and lightbox are
// skipped (the gallery links then open the photo on its own page instead).
function dialogsSupported() {
  return typeof HTMLDialogElement === "function";
}

// Opens a dialog as a modal and stops the page behind it from scrolling.
function openDialog(dialog) {
  dialog.showModal();
  document.body.classList.add("no-scroll");
}

// Sets up the ways a dialog can be closed: any element with data-close, a click
// on the dark area outside the window, or the Esc key (built into dialogs).
function setupDialogClosing(dialog) {
  dialog.querySelectorAll("[data-close]").forEach(function (button) {
    button.addEventListener("click", function () {
      dialog.close();
    });
  });

  // A click on the backdrop counts as a click on the dialog itself. Clicks on
  // the content inside are ignored, because event.target is then a child.
  dialog.addEventListener("click", function (event) {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  // The "close" event fires however the dialog was closed, so the page's
  // scrolling is always switched back on.
  dialog.addEventListener("close", function () {
    document.body.classList.remove("no-scroll");
  });
}

/* ---- 1. Team bio modal ------------------------------------------------------
   Each "Read bio" button sits inside a team card. When it is clicked we copy
   that card's name, role and photo into the modal, add the bio text stored in
   the button's data-bio attribute, and open the modal. */
function setupBioModal() {
  var modal = document.getElementById("bio-modal");
  var buttons = document.querySelectorAll(".bio-button");

  if (!modal || !buttons.length || !dialogsSupported()) {
    return;
  }

  var photo = modal.querySelector(".modal-photo");
  var nameField = modal.querySelector(".modal-name");
  var roleField = modal.querySelector(".modal-role");
  var bioField = modal.querySelector(".modal-bio");

  setupDialogClosing(modal);

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      var card = button.closest(".card");
      var cardPhoto = card.querySelector(".card-image img");

      nameField.textContent = card.querySelector("h3").textContent;
      roleField.textContent = card.querySelector(".trail-meta").textContent;
      bioField.textContent = button.dataset.bio;

      // Team members without a photo yet only show their name and bio.
      if (cardPhoto) {
        photo.src = cardPhoto.src;
        photo.alt = cardPhoto.alt;
        photo.hidden = false;
      } else {
        photo.hidden = true;
      }

      openDialog(modal);
    });
  });
}

/* ---- 2. Photo gallery with lightbox ----------------------------------------
   Every thumbnail in the gallery is a normal link to the full photo, so it
   still works if JavaScript is off. With JavaScript, clicking it opens the
   photo large in the lightbox, and the Previous / Next buttons and the left and
   right arrow keys move through the whole gallery. */
function setupGallery() {
  var items = Array.from(document.querySelectorAll(".gallery-item"));
  var lightbox = document.getElementById("lightbox");

  if (!items.length || !lightbox || !dialogsSupported()) {
    return;
  }

  var image = lightbox.querySelector(".lightbox-image");
  var caption = lightbox.querySelector(".lightbox-caption");
  var count = lightbox.querySelector(".lightbox-count");
  var current = 0;

  setupDialogClosing(lightbox);

  // Shows photo number "index". Going past the last photo wraps to the first
  // and going back from the first wraps to the last.
  function showImage(index) {
    current = (index + items.length) % items.length;
    var item = items[current];

    image.src = item.href;
    image.alt = item.dataset.alt;
    caption.textContent = item.dataset.caption;
    count.textContent = (current + 1) + " of " + items.length;
  }

  items.forEach(function (item, index) {
    item.addEventListener("click", function (event) {
      // Stop the link from opening the photo on a page of its own.
      event.preventDefault();
      showImage(index);
      openDialog(lightbox);
    });
  });

  lightbox.querySelector(".lightbox-prev").addEventListener("click", function () {
    showImage(current - 1);
  });

  lightbox.querySelector(".lightbox-next").addEventListener("click", function () {
    showImage(current + 1);
  });

  // Arrow keys work while the lightbox is open.
  lightbox.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") {
      showImage(current - 1);
    } else if (event.key === "ArrowRight") {
      showImage(current + 1);
    }
  });
}

/* ---- 3. FAQ accordion (jQuery) ----------------------------------------------
   Each question is a button (.accordion-trigger) whose aria-controls attribute
   holds the id of its answer panel. Clicking it slides that answer open and
   closes any other open answer, so only one is open at a time.
   aria-expanded tells screen readers whether an answer is open; the CSS also
   uses it to turn the + into an x. Adding the js-accordion class is what makes
   the CSS hide the answers, so without JavaScript every answer stays visible. */
function setupAccordion($) {
  var $accordion = $(".accordion");

  if (!$accordion.length) {
    return;
  }

  $accordion.addClass("js-accordion");
  var $triggers = $accordion.find(".accordion-trigger");

  // Opens or closes one item. stop(true, true) finishes any slide that is
  // still running first, so quick clicking cannot leave an answer half open.
  function setItem($trigger, shouldOpen) {
    var $panel = $("#" + $trigger.attr("aria-controls"));
    $trigger.attr("aria-expanded", shouldOpen ? "true" : "false");
    $panel.stop(true, true)[shouldOpen ? "slideDown" : "slideUp"](250);
  }

  $triggers.on("click", function () {
    var $clicked = $(this);
    var isOpen = $clicked.attr("aria-expanded") === "true";

    // Close every other item, then open or close the clicked one.
    $triggers.not($clicked).each(function () {
      setItem($(this), false);
    });
    setItem($clicked, !isOpen);
  });
}

/* ==========================================================================
   Contact page: interactive map (Leaflet)
   Shows our meeting points on a map that can be dragged and zoomed. The
   locations are not stored in this file. They are read from the location cards
   in contact.html (the data-lat and data-lng attributes), so the page's text,
   the map and the search engines all see the same information.
   Features:
   1. A marker on the map for every location card, with a popup
   2. "Show on map" buttons that fly the map to a location
   3. "Find my nearest meeting point", which uses the visitor's location
   ========================================================================== */

document.addEventListener("DOMContentLoaded", setupLocationMap);

function setupLocationMap() {
  var mapElement = document.getElementById("map");

  // Any page except Contact has no map, so there is nothing to do.
  if (!mapElement) {
    return;
  }

  var fallback = document.getElementById("map-fallback");

  // Leaflet is loaded from a CDN in contact.html. If it did not load (for
  // example, there is no internet connection) we show a message instead of
  // the map. The list of locations stays visible either way.
  if (typeof L === "undefined") {
    mapElement.hidden = true;
    fallback.hidden = false;
    return;
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Build one "point" for every location card. latlng is Leaflet's pair of
  // coordinates, and marker is filled in a little further down.
  var points = Array.from(document.querySelectorAll(".location-card")).map(function (card, index) {
    return {
      card: card,
      number: index + 1,
      name: card.dataset.name,
      latlng: L.latLng(Number(card.dataset.lat), Number(card.dataset.lng)),
      marker: null
    };
  });

  var map = L.map(mapElement, {
    // Scrolling the page should not suddenly zoom the map. Wheel zoom is
    // switched on when the map is clicked and off again when the mouse leaves.
    scrollWheelZoom: false,
    // On phones one finger scrolls the page instead of getting stuck on the
    // map. Two fingers still pan and zoom the map.
    dragging: !L.Browser.mobile
  });

  map.on("click", function () {
    map.scrollWheelZoom.enable();
  });
  map.on("mouseout", function () {
    map.scrollWheelZoom.disable();
  });

  // The map picture itself comes from OpenStreetMap, which must be credited.
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  // Start zoomed out just far enough to show every location.
  var bounds = L.latLngBounds(points.map(function (point) {
    return point.latlng;
  }));

  function showAllPoints() {
    map.fitBounds(bounds, { padding: [50, 50] });
  }

  showAllPoints();

  /* Highlights the chosen location's card in the list (and un-highlights the
     others) so the card and the marker clearly belong together. */
  function setActive(point) {
    points.forEach(function (other) {
      other.card.classList.toggle("is-active", other === point);
    });
  }

  /* Builds the popup for a marker out of elements, using textContent so the
     text is always shown as plain text. */
  function buildPopup(point) {
    var box = document.createElement("div");

    var title = document.createElement("strong");
    title.textContent = point.name;

    var address = document.createElement("p");
    address.textContent = point.card.querySelector("address").textContent.trim();

    var link = document.createElement("a");
    link.href = point.card.querySelector(".directions-link").href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Get directions";

    box.appendChild(title);
    box.appendChild(address);
    box.appendChild(link);
    return box;
  }

  // Moves the map to a location, opens its popup and highlights its card.
  function goTo(point) {
    setActive(point);
    point.marker.openPopup();

    if (reducedMotion) {
      map.setView(point.latlng, 14);
    } else {
      map.flyTo(point.latlng, 14, { duration: 1.2 });
    }

    // On small screens the list sits below the map, so bring the map into view.
    mapElement.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
  }

  // Add a numbered marker for every location. The numbers match the cards.
  points.forEach(function (point) {
    var icon = L.divIcon({
      className: "map-pin",
      html: String(point.number),
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -20]
    });

    // title and alt give the marker a name for screen readers and tooltips.
    point.marker = L.marker(point.latlng, { icon: icon, title: point.name, alt: point.name }).addTo(map);
    point.marker.bindPopup(buildPopup(point));
    point.marker.on("click", function () {
      setActive(point);
    });

    point.card.querySelector(".show-on-map").addEventListener("click", function () {
      goTo(point);
    });
  });

  // The buttons only appear now, because they do nothing without the map.
  document.querySelector(".find-us").classList.add("map-ready");
  document.getElementById("map-toolbar").hidden = false;

  document.getElementById("show-all").addEventListener("click", function () {
    points.forEach(function (point) {
      point.card.classList.remove("is-active");
    });
    map.closePopup();
    showAllPoints();
  });

  /* ---- Find my nearest meeting point ---------------------------------------
     Asks the browser for the visitor's location. The browser always shows its
     own permission question first, and the location is only used in this
     page. It is never sent anywhere. */
  var findButton = document.getElementById("find-nearest");
  var result = document.getElementById("nearest-result");
  var hereMarker = null;

  function showResult(message, isError) {
    result.textContent = message;
    result.classList.toggle("is-error", isError);
    result.hidden = false;
  }

  function resetFindButton() {
    findButton.disabled = false;
    findButton.textContent = "Find my nearest meeting point";
  }

  // Called by the browser when it has worked out where the visitor is.
  function onLocationFound(position) {
    var here = L.latLng(position.coords.latitude, position.coords.longitude);

    // distanceTo gives the straight-line distance in metres. Keep whichever
    // location is closest.
    var nearest = points[0];
    points.forEach(function (point) {
      if (here.distanceTo(point.latlng) < here.distanceTo(nearest.latlng)) {
        nearest = point;
      }
    });

    // Show the visitor on the map (removing an earlier "You are here" dot).
    if (hereMarker) {
      hereMarker.remove();
    }
    hereMarker = L.circleMarker(here, {
      radius: 9,
      color: "#2E2E2E",
      weight: 3,
      fillColor: "#D8C9A3",
      fillOpacity: 1
    }).addTo(map).bindTooltip("You are here");

    setActive(nearest);
    nearest.marker.openPopup();
    map.fitBounds(L.latLngBounds([here, nearest.latlng]), { padding: [60, 60], maxZoom: 13 });

    showResult(
      "Your nearest meeting point is " + nearest.name + ", about " +
      formatDistance(here.distanceTo(nearest.latlng)) + " away in a straight line. " +
      "Use its Get directions link for the driving route.",
      false
    );
    resetFindButton();
  }

  // Called by the browser when it could not get the location.
  function onLocationFailed(error) {
    var message;

    if (error.code === 1) {
      message = "We were not allowed to see your location. You can allow it in your browser's address bar, or use the Get directions links below.";
    } else if (error.code === 3) {
      message = "Finding your location took too long. Please try again.";
    } else {
      message = "We could not work out where you are. Please use the Get directions links below.";
    }

    showResult(message, true);
    resetFindButton();
  }

  findButton.addEventListener("click", function () {
    if (!("geolocation" in navigator)) {
      showResult("Your browser cannot share your location. Please use the Get directions links below.", true);
      return;
    }

    // Disable the button while waiting so it cannot be clicked twice.
    findButton.disabled = true;
    findButton.textContent = "Finding your location...";

    navigator.geolocation.getCurrentPosition(onLocationFound, onLocationFailed, {
      timeout: 10000,
      maximumAge: 300000
    });
  });
}

/* Turns a distance in metres into friendly text: "450 m", "8.4 km" or "312 km". */
function formatDistance(metres) {
  if (metres < 1000) {
    return Math.max(10, Math.round(metres / 10) * 10) + " m";
  }
  return (metres / 1000).toFixed(metres < 10000 ? 1 : 0) + " km";
}