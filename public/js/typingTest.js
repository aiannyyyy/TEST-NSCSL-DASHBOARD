const paragraphSources = [
    "Technology is transforming the way we live and work. From smartphones to smart homes, innovation is making everyday tasks more efficient. Embracing these changes can lead to a more connected and convenient lifestyle.",
    "The beauty of nature lies in its diversity. Mountains, oceans, forests, and deserts each offer unique experiences. Exploring the outdoors not only provides adventure but also improves mental and physical well-being.",
    "Reading books can transport us to different worlds, introduce us to new ideas, and expand our imagination. Whether fiction or nonfiction, the written word holds the power to change perspectives and inspire minds.",
    "A healthy lifestyle involves more than just exercise. Nutrition, sleep, and mental health are all essential components. Making time for self-care can lead to long-term benefits and improved quality of life.",
    "History teaches us valuable lessons. By studying past events and civilizations, we gain insights into human behavior, culture, and the consequences of decisions. This understanding can help guide better choices in the present."
  ];

  let startTime, timerRunning = false;

  function startTest() {
    const paragraph = paragraphSources[Math.floor(Math.random() * paragraphSources.length)];
    const testTextElement = document.getElementById("testText");
    const typingInput = document.getElementById("typingInput");

    testTextElement.textContent = paragraph;
    typingInput.value = "";
    typingInput.disabled = false;
    typingInput.focus();
    document.getElementById("wpmDisplay").textContent = "WPM: 0";

    startTime = new Date().getTime();
    timerRunning = true;
  }

  document.getElementById("typingInput").addEventListener("input", function () {
    if (!timerRunning) return;

    const currentTime = new Date().getTime();
    const elapsedTime = (currentTime - startTime) / 1000 / 60; // in minutes
    const typedText = this.value.trim();
    const wordCount = typedText.length > 0 ? typedText.split(/\s+/).length : 0;
    const wpm = Math.round(wordCount / elapsedTime);
    document.getElementById("wpmDisplay").textContent = "WPM: " + (isNaN(wpm) ? 0 : wpm);

    // Stop if paragraph matches
    const targetText = document.getElementById("testText").textContent.trim();
    if (typedText === targetText) {
      timerRunning = false;
      this.disabled = true;
    }
  });

  const typingInput = document.getElementById("typingInput");

  typingInput.addEventListener("keydown", function (e) {
    if (e.key === "Backspace") {
      e.preventDefault(); // Block backspace
    }
  });

  function stopTest() {
    const typingInput = document.getElementById("typingInput");
    const testTextElement = document.getElementById("testText");
  
    typingInput.value = "";
    typingInput.disabled = true;
    testTextElement.textContent = "Click \"Start Test\" to generate a paragraph.";
    document.getElementById("wpmDisplay").textContent = "0";
    document.getElementById("timeLeft").textContent = "60";
  
    clearInterval(countdownInterval);
    timerRunning = false;
  }
  