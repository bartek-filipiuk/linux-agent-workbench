(function () {
  "use strict";

  /* ---------- Sky comparison slider ---------- */
  var slider = document.getElementById("compareSlider");
  var brightLayer = document.querySelector(".compare-layer--bright");
  var valueText = document.getElementById("compareValue");

  function updateCompare() {
    var v = Number(slider.value);
    brightLayer.style.clipPath = "inset(0 " + (100 - v) + "% 0 0)";

    var label;
    if (v <= 2) {
      label = "Showing the dark sky only";
    } else if (v >= 98) {
      label = "Showing the light-polluted sky only";
    } else if (v === 50) {
      label = "Split at the middle";
    } else {
      label = "Light-polluted sky revealed " + v + "%";
    }
    valueText.textContent = label;
    slider.setAttribute("aria-valuetext", label);
  }

  if (slider && brightLayer && valueText) {
    slider.addEventListener("input", updateCompare);
    updateCompare();
  }

  /* ---------- Checklist ---------- */
  var checklistInputs = Array.prototype.slice.call(
    document.querySelectorAll(".checklist-input")
  );
  var progressCount = document.getElementById("progressCount");
  var resetButton = document.getElementById("resetChecklist");

  function updateProgress() {
    var checked = checklistInputs.filter(function (input) {
      return input.checked;
    }).length;
    progressCount.textContent = String(checked);
  }

  checklistInputs.forEach(function (input) {
    input.addEventListener("change", updateProgress);
  });

  if (resetButton) {
    resetButton.addEventListener("click", function () {
      checklistInputs.forEach(function (input) {
        input.checked = false;
      });
      updateProgress();
      if (checklistInputs[0]) {
        checklistInputs[0].focus();
      }
    });
  }

  updateProgress();
})();
