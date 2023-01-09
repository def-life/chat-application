document.addEventListener("DOMContentLoaded", init);

function init() {
  // dom references
  const messageBox = document.querySelector("#message");
  const sendBtn = document.querySelector(".send");
  const regBtn = document.querySelector(".regBtn");
  const username = document.querySelector("#username");
  const registerBox = document.querySelector(".register-box");
  const section2 = document.querySelector(".section-2");
  const userList = document.querySelector(".users-list");
  const messages = document.querySelector(".allMessages");
  const typingUsers = document.querySelector("#typingUsers");

  let isTyping = false;

  // animations
  const animations = {
    fadeOut: [{ opacity: 1 }, { opacity: 0 }],
    fadeIn: [{ opacity: 0 }, { opacity: 1 }],
  };

  // some constant values
  const url = "ws://localhost:3004";

  // adding some functionalities to the WebSocket instance
  WebSocket.prototype.emit = function (event, data) {
    this.send(JSON.stringify({ event, data }));
  };

  WebSocket.prototype.listen = function (eventName, callback) {
    this._socketEvents = this._socketEvents || {};
    this._socketEvents[eventName] = this._socketEvents[eventName] || [];
    this._socketEvents[eventName].push(callback);
  };

  const websocket = new WebSocket(url);

  function handleRegister(ev) {
    const msg = username.value;
    if (!msg) {
      alert("enter some username");
      return;
    }

    websocket.emit("user", { msg });

    registerBox.animate(animations.fadeOut, {
      duration: 300,
      easing: "linear",
    }).onfinish = (ev) => {
      ev.target.effect.target.remove();
    };

    section2.animate(animations.fadeIn, {
      duration: 600,
      easing: "linear",
      fill: "forwards",
      delay: 300,
    });

    username.value = "";
  }

  function handleKeyPress(ev) {
    const message = ev.currentTarget.value;
    if (message) {
      sendBtn.disabled = false;
      if (!isTyping) {
        websocket.emit("addTyping");
        isTyping = true;
      }
    } else {
      sendBtn.disabled = true;
      websocket.emit("removeTyping");
      isTyping = false;
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      websocket.emit("updateUserStatus", { msg: "green" });
    } else {
      websocket.emit("updateUserStatus", { msg: "yellow" });
    }
  }

  function sendMessage() {
    const msg = messageBox.value;
    if (msg) {
      websocket.emit("oldMessage", { msg });
      websocket.emit("removeTyping");
      isTyping = false;
      messageBox.value = "";
      sendBtn.disabled = true;
    }
  }

  function onOpen() {
    console.log("web socket connection is open");
    messageBox.addEventListener("keyup", handleKeyPress);
    sendBtn.addEventListener("click", sendMessage);
    regBtn.addEventListener("click", handleRegister);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // adding some events and their listeners

    websocket.listen("newMessage", (messageArray) => {
      // clear the old html
      messages.innerHTML = "";
      const fragment = document.createDocumentFragment();

      messageArray.forEach((message) => {
        const p = document.createElement("p");
        p.textContent = `${message.username}: ${message.msg}`;
        fragment.appendChild(p);
      });

      messages.appendChild(fragment);
    });

    websocket.listen("allUsers", (users) => {
      // clear the old html
      userList.innerHTML = "";

      const fragment = document.createDocumentFragment();
      users.forEach((user) => {
        if (user) {
          const li = document.createElement("li");
          li.textContent = `${user.username}`;
          li.classList.add(user.status);
          fragment.appendChild(li);
        }
      });

      userList.appendChild(fragment);
    });

    websocket.listen("typingUsers", (users) => {
      console.log(users.length);
      let str = "";
      if (!users.length) {
        // clear the old content
        typingUsers.textContent = "";
        return;
      };

      if (users.length === 1) {
        str = `${users[0]} is typing...`;
      } else {
        str = "".concat(
          users[0],
          " and ",
          users.length - 1,
          " more are typing..."
        );
      }

      typingUsers.textContent = str;
    });
  }

  function onMessage(ev) {
    try {
      const { event, data } = JSON.parse(ev.data);
      console.log(event, data);
      websocket._socketEvents[event].forEach((callback) => {
        callback(data);
      });
    } catch (err) {
      // ignore errors due to some string text or binary data from server
      // those data not needed for this app
    }
  }

  function onClose() {
    console.log("closed");
    messageBox.removeEventListener("keyup", handleKeyPress);
    sendBtn.removeEventListener("click", sendMessage);
    regBtn.removeEventListener("click", handleRegister);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  function onError(err) {
    console.log(err);
  }

  websocket.addEventListener("open", onOpen);
  websocket.addEventListener("error", onError);
  websocket.addEventListener("close", onClose);
  websocket.addEventListener("message", onMessage);
}
