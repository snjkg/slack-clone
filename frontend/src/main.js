// A helper you may want to use when uploading new images to the server.
import { fileToDataUrl, BACKEND_ROOT, showModal } from './helpers.js';

var user;
var channels;
var messageCache = [];
var db;

loadLogin();



function loadLogin() {

  user = JSON.parse(window.localStorage.getItem('user'));
  console.log(user);
  if (!user) {
    document.querySelector('main').replaceChildren(
      document.querySelector('#tmpl-login').content.cloneNode(true)
    );
    document.querySelector('#btn-register').addEventListener('click', loadRegister);
    document.querySelector('#sec-login form').addEventListener('submit', function (event) {
      event.preventDefault();
      const formObj = {};
      const formData = new FormData(event.target);
      formData.forEach((value, key) => (formObj[key] = value));



      if (formData.get("email") == '' || formData.get("password") == '') {
        showModal('All fields required.');
      } else {
        fetch(BACKEND_ROOT + 'auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formObj),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              console.log(response.data);
              user = response.data;
              window.localStorage.setItem('user', JSON.stringify(user));
              loadApp();
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      }


    });
  } else {
    loadApp();
  }

}

function loadRegister() {
  document.querySelector('main').replaceChildren(
    document.querySelector('#tmpl-register').content.cloneNode(true)
  );
  document.querySelector('#btn-login').addEventListener('click', loadLogin);

  document.querySelector('#sec-register form').addEventListener('submit', function (event) {
    event.preventDefault();
    const formObj = {};
    const formData = new FormData(event.target);
    formData.forEach((value, key) => (formObj[key] = value));

    //console.log(JSON.stringify(formObj));
    if (!formObj['password'] || !formObj['email'] || !formObj['name']) {
      showModal('All fields are required.');
    }
    else if (formObj['password'] != formObj['confirm-password']) {
      showModal('Password and confirm password fields do not match.');
    } else {
      fetch(BACKEND_ROOT + 'auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            user = response.data;
            loadApp();
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    }

  });

}
function loadApp() {

  document.querySelector('main').replaceChildren(
    document.querySelector('#tmpl-2-col').content.cloneNode(true)
  );
  document.querySelector('#lnk-create-channel').addEventListener('click', loadCreateChannel);
  document.querySelector('#lnk-logout').addEventListener('click', (e) => {
    fetch(BACKEND_ROOT + 'auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({}),
    })
    window.localStorage.clear();
    user = null;
    window.location.hash = '';
    loadLogin(); 
  });

  loadChannels().then(x => {
    if (window.location.hash) {
      resolveHash();
    }
    initDB();
    document.querySelector('#lnk-notifications').addEventListener('click', (e) => {
      Notification.requestPermission().then(() => {
        if (Notification.permission == 'granted') {
          document.querySelector('#lnk-notifications').replaceChildren(document.createTextNode("Notifications Enabled"));
          initNotifications();
        }
      });
    });
  });

}
function loadChannels() {
  return fetch(BACKEND_ROOT + 'channel', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'Accept': 'application/json'
    },
  })

    .then((response) => response.json())
    .catch(x => {
      return JSON.parse(window.localStorage.getItem('channelsCache'));
    }
    )
    .then((data) => {

      window.localStorage.setItem('channelsCache', JSON.stringify(data));
      channels = data.channels;

      console.log(channels);
      const public_channels = channels.filter(x => !x.private);
      //console.log(public_channels.map(x=> document.createElement("li").appendChild(document.createElement("a").appendChild(document.createTextNode(x.name))) ));

      document.querySelector('#public-channels').replaceChildren(
        ...public_channels.map(x => {
          const list = document.createElement("li");
          const a = document.createElement("a");
          a.appendChild(document.createTextNode(x.name));
          a.href = '/#channel=' + x.id;
          list.appendChild(a);
          return list;
        })
      );

      const private_channels = channels.filter(x => x.private && x.members.includes(user.userId));

      document.querySelector('#private-channels').replaceChildren(
        ...private_channels.map(x => {
          const list = document.createElement("li");
          const a = document.createElement("a");
          a.appendChild(document.createTextNode(x.name));
          a.href = '/#channel=' + x.id;
          list.appendChild(a);
          return list;
        })
      );

    })

}
function loadCreateChannel() {
  document.querySelector('#right').replaceChildren(
    document.querySelector('#tmpl-create-channel').content.cloneNode(true)
  );
  document.querySelector('#right form').addEventListener('submit', function (event) {
    event.preventDefault();
    const formObj = {};
    const formData = new FormData(event.target);
    formData.forEach((value, key) => (formObj[key] = value));

    //console.log(JSON.stringify(formObj));
    if (!formObj['name']) {
      showModal('Please enter a name.');
    } else {
      if (!formObj['description']) {
        formObj['description'] = formObj['name'];
      }
      formObj['private'] = formObj['private'] == 'true' ? true : false;

      console.log(JSON.stringify(formObj));
      fetch(BACKEND_ROOT + 'channel', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            loadChannels();
            console.log(response);
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    }
  });
}
function loadJoinChannel(channel) {
  const id = channel.id;
  const h3 = document.createElement("h3");
  h3.textContent = "Channel: " + channel.name;
  h3.className = 'title is-size-3';
  const p = document.createElement("p");
  p.textContent = "You are not part of this channel. Join the channel to view details.";
  const btn = document.createElement("button");
  btn.textContent = "Join Channel";
  btn.className = 'button is-primary';
  btn.addEventListener('click', function (event) {
    fetch(BACKEND_ROOT + 'channel/' + id + '/join', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 'channelId': id }),
    })
      .then((response) => response.json().then(data => ({ status: response.status, data })))
      .then((response) => {
        if (response.status == 200) {
          const members = channel.members;
          members.push(user.userId);
          console.log(channels.findIndex(x => x.id == id));
          Object.assign(channels[channels.findIndex(x => x.id == id)], { 'members': members });
          loadChannel(id);
        }
      });

  });
  document.querySelector('#right').replaceChildren(h3, p, btn);
}
function getUser(id) {
  if (window.localStorage.getItem("user-" + id)) {
    //console.log(window.localStorage.getItem("user-"+id));
    return Promise.resolve(JSON.parse(window.localStorage.getItem("user-" + id)));
  }

  return fetch(BACKEND_ROOT + 'user/' + id, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'Accept': 'application/json'
    },
  })
    .then((response) => response.json())
    .then(responseObj => {
      responseObj = { 'id': id, ...responseObj };
      console.log(responseObj);
      window.localStorage.setItem("user-" + id, JSON.stringify(responseObj));
      return responseObj;
    })
}
function loadChannel(id) {

  const channel = channels.find(x => x.id == id);
  if (!channel.members.includes(user.userId)) {
    loadJoinChannel(channel);
  } else {

    fetch(BACKEND_ROOT + 'channel/' + id, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + user.token,
        'Accept': 'application/json'
      },
    })
      .then((response) => response.json())
      .catch(x => JSON.parse(window.localStorage.getItem('channelCache')))
      .then((channel) => {
        window.localStorage.setItem('channelCache', JSON.stringify(channel));
        console.log(channel);
        document.querySelector('#right').replaceChildren(
          document.querySelector('#tmpl-view-channel').content.cloneNode(true)
        );
        document.querySelector('#new-message').appendChild(
          document.querySelector('#tmpl-message-form').content.cloneNode(true)
        );
        handleNewMessages(id);
        document.querySelector('#channel-name').textContent = channel.name;
        document.querySelector('#channel-description').textContent = channel.description;
        document.querySelector('#channel-type').textContent = channel.private ? 'Private' : 'Public';

        const d = new Date(channel.createdAt);
        document.querySelector('#channel-timestamp').textContent = d.toLocaleString();

        document.querySelector('#channel-edit-btn').addEventListener('click', function () { loadEditChannel(id, channel.name, channel.description) });
        document.querySelector('#channel-invite-btn').addEventListener('click', function () { loadInvite(id, channel.members) });

        getUser(channel.creator)
          .then((creator) => {

            document.querySelector('#channel-creator').textContent = creator.name;
          });
        document.querySelector('#channel-leave-btn').addEventListener('click', function (event) {
          fetch(BACKEND_ROOT + 'channel/' + id + '/leave', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + user.token,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ 'channelId': id }),
          })
            .then((response) => response.json().then(data => ({ status: response.status, data })))
            .then((response) => {
              if (response.status == 200) {
                const members = channel.members;
                //console.log(channels.findIndex(x => x.id == id));
                Object.assign(channels[channels.findIndex(x => x.id == id)], { 'members': members.filter(x => x != user.userId) });
                loadChannel(id);
              }
            });
        });
        messageCache = [];
        //lastLoaded = 0;
        document.querySelector('#loading').textContent = "Loading";
        loadMessages(id).then(() => {

          showMoreMessages(5);
          const intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting === true) {

                observer.unobserve(entry.target);
                showMoreMessages(5);

                setTimeout(() => { observer.observe(document.querySelector("#loading")); }, 1000);

              }
            });
          }, { threshold: 0.8, delay: 1000 });
          intersectionObserver.observe(document.querySelector("#loading"));
          const reloadMessage = () => {
            if (window.location.hash == '#channel=' + id) {
              loadMessages(id).then(() => showNewMessges());
              setTimeout(reloadMessage, 15000)
            }
          };
          setTimeout(reloadMessage, 15000)
        });


        // start observing


      });

  }
}
function handleNewMessages(id) {

  document.querySelector('#new-message .message-form-tab').replaceChildren(
    document.querySelector('#tmpl-message-form-text').content.cloneNode(true)
  );
  document.querySelector('#new-message .text-tab').className = "text-tab is-active";

  document.querySelector('#new-message .image-tab').addEventListener('click', function (event) {
    document.querySelector('#new-message .message-form-tab').replaceChildren(
      document.querySelector('#tmpl-message-form-image').content.cloneNode(true)
    );
    document.querySelector('#new-message .image-tab').className = "image-tab is-active";
    document.querySelector('#new-message .text-tab').className = "text-tab";
    document.querySelector('#new-message .file-name').textContent = 'No file selected.';
    const fileInput = document.querySelector('#new-message .message-form-tab input[type="file"]');
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        document.querySelector('#new-message .file-name').textContent = fileInput.files[0].name;
      }
    });
  });

  document.querySelector('#new-message .text-tab').addEventListener('click', function (event) {
    document.querySelector('#new-message .message-form-tab').replaceChildren(
      document.querySelector('#tmpl-message-form-text').content.cloneNode(true)
    );
    document.querySelector('#new-message .image-tab').className = "image-tab";
    document.querySelector('#new-message .text-tab').className = "text-tab is-active";
  });

  document.querySelector('#new-message form').addEventListener('submit', function (event) {
    event.preventDefault();
    const file = document.querySelector('#new-message .message-form-tab input[type="file"]') ?
      document.querySelector('#new-message .message-form-tab input[type="file"]').files[0] : null;

    const formObj = {};
    const formData = new FormData(event.target);
    formData.forEach((value, key) => (formObj[key] = value));

    //console.log(JSON.stringify(formObj));
    if ((!formObj.message || formObj.message.trim() === '') && !file) {
      showModal('Please enter a message.');
    } else if (formObj.message) {
      console.log(formObj.message.trim());
      fetch(BACKEND_ROOT + 'message/' + id, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            loadMessages(id).then(() => {
              //console.log('show new');
              showNewMessges();
            });
            console.log(response);
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    } else {
      fileToDataUrl(file).then(fileUrl => {
        fetch(BACKEND_ROOT + 'message/' + id, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 'image': fileUrl }),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              loadMessages(id).then(() => {
                //console.log('show new');
                showNewMessges();
              });
              console.log(response);
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      });
    }
  });
}
function showMoreMessages(num) {
  const displayedMessages = [...document.querySelectorAll('.message-card')].map(x => parseInt(x.attributes.getNamedItem('data-id').value));
  //console.log(displayedMessages);
  const notDisplayedMessages = messageCache.filter(x => !displayedMessages.includes(x.id));
  //console.log(notDisplayedMessages);
  let messagesToShow = notDisplayedMessages.sort((a, b) => {
    if (a.pinned && !b.pinned) {
      return -1;
    } else if (!a.pinned && b.pinned) {
      return 1;
    } else {
      return b.id - a.id;
    }

  });
  messagesToShow = messagesToShow.slice(0, num);


  if (messagesToShow.length == 0) {
    document.querySelector('#loading').textContent = "No more messages";
  } else {
    document.querySelector('#loading').textContent = "Loading";

  }


  for (const message of messagesToShow) {
    const messageHtml = document.querySelector('#tmpl-message').content.cloneNode(true);
    messageHtml.firstElementChild.dataset.id = message.id;
    const cards = [...document.querySelectorAll('.message-card')].filter(x => x.dataset.id < message.id);
    if (cards.length > 0) {
      document.querySelector('#messages').insertBefore(messageHtml, cards[0]);
    } else {
      document.querySelector('#messages').appendChild(messageHtml);
    }
    refreshMessageContent(message)
  }
}
function showNewMessges() {
  const displayedMessages = [...document.querySelectorAll('.message-card')].map(x => parseInt(x.attributes.getNamedItem('data-id').value));
  const latestMessage = Math.max(...displayedMessages);
  let newMessages = [];
  //console.log('show new');
  console.log(latestMessage);
  if (!latestMessage) {
    showMoreMessages(5);
    return;
  }
  //console.log(messageCache)
  for (const message of messageCache) {
    if (message.id <= latestMessage) {
      break;
    }
    const messageHtml = document.querySelector('#tmpl-message').content.cloneNode(true);
    messageHtml.firstElementChild.dataset.id = message.id;
    newMessages.push(messageHtml);
  }
  //console.log(newMessages);
  document.querySelector('#messages').prepend(...newMessages);
  for (const message of messageCache) {
    if (message.id <= latestMessage) {
      break;
    }
    refreshMessageContent(message);
  }
}
function handleEditMessage(message) {

  let newForm = document.querySelector('#tmpl-message-form').content.cloneNode(true);
  document.querySelector('.message-card[data-id="' + message.id + '"] .content').replaceChildren(
    newForm
  );
  newForm = document.querySelector('.message-card[data-id="' + message.id + '"] .content form');


  newForm.querySelector('.message-form-tab').replaceChildren(
    document.querySelector('#tmpl-message-form-text').content.cloneNode(true)
  );
  newForm.querySelector('.text-tab').className = "text-tab is-active";
  newForm.querySelector('textarea').innerText = message.message ? message.message : '';


  newForm.querySelector('.image-tab').addEventListener('click', function (event) {
    newForm.querySelector('.message-card[data-id="' + message.id + '"] .message-form-tab').replaceChildren(
      document.querySelector('#tmpl-message-form-image').content.cloneNode(true)
    );
    newForm.querySelector('.image-tab').className = "image-tab is-active";
    newForm.querySelector('.text-tab').className = "text-tab";
    newForm.querySelector('.message-card[data-id="' + message.id + '"] .file-name').textContent = 'No file selected.';
    const fileInput = newForm.querySelector('.message-card[data-id="' + message.id + '"] .message-form-tab input[type="file"]');
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        newForm.querySelector('.message-card[data-id="' + message.id + '"] .file-name').textContent = fileInput.files[0].name;
      }
    });
  });

  newForm.querySelector('.text-tab').addEventListener('click', function (event) {
    //
    newForm.querySelector('.message-form-tab').replaceChildren(
      document.querySelector('#tmpl-message-form-text').content.cloneNode(true)
    );
    newForm.querySelector('.image-tab').className = "image-tab";
    newForm.querySelector('.text-tab').className = "text-tab is-active";
    newForm.querySelector('textarea').innerText = message.message ? message.message : '';
  });


  newForm.querySelector('button').innerText = 'Edit';
  const newButton = document.createElement("button");
  newButton.innerText = 'Cancel';
  newButton.type = 'Button';
  newButton.className = 'button mb-2 mt-2';
  newButton.addEventListener('click', e => {
    const oldSpan = document.createElement("span");
    oldSpan.className = 'message-content';
    oldSpan.innerText = message.message;
    document.querySelector('.message-card[data-id="' + message.id + '"] .content').replaceChildren(
      oldSpan
    );
    if (message.image) {
      const oldImg = document.createElemenet("img");
      oldImg.src = message.image;
      img.alt = 'User submitted image';
      document.querySelector('.message-card[data-id="' + message.id + '"] .content').appendChild(oldImg);
    }
  });
  newForm.appendChild(newButton);

  document.querySelector('.message-card[data-id="' + message.id + '"] form').addEventListener('submit', function (event) {

    event.preventDefault();
    const file = document.querySelector('.message-card[data-id="' + message.id + '"] .message-form-tab input[type="file"]') ?
      document.querySelector('.message-card[data-id="' + message.id + '"] .message-form-tab input[type="file"]').files[0] : null;

    const formObj = { message: null, image: null };
    const formData = new FormData(event.target);
    formData.forEach((value, key) => (formObj[key] = value));
    const channel = window.location.hash.replace("#channel=", "");
    //console.log(JSON.stringify(formObj));
    if ((!formObj.message || formObj.message.trim() === '') && !file) {
      showModal('Please enter a message.');
    } else if (formObj.message) {
      if (formObj.message == message.message) {
        showModal('Message cannot be the same.');
      } else {
        delete formObj.image;

        //console.log(JSON.stringify(formObj));
        fetch(BACKEND_ROOT + 'message/' + channel + '/' + message.id, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(formObj),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              loadMessages(channel).then(() => {
                const newSpan = document.createElement("span");
                newSpan.className = 'message-content';
                document.querySelector('.message-card[data-id="' + message.id + '"] .content').replaceChildren(
                  newSpan
                );
                refreshMessageContent(messageCache.find(x => x.id == message.id));
              });
              console.log(response);
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      }
    } else {
      fileToDataUrl(file).then(fileUrl => {
        fetch(BACKEND_ROOT + 'message/' + channel + '/' + message.id, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ 'image': fileUrl }),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              loadMessages(channel).then(() => {
                const newSpan = document.createElement("span");
                newSpan.className = 'message-content';
                document.querySelector('.message-card[data-id="' + message.id + '"] .content').replaceChildren(
                  newSpan
                );
                refreshMessageContent(messageCache.find(x => x.id == message.id));
              });
              console.log(response);
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      });
    }
  });
}
function showImageModal(message) {
  const imageMessages = messageCache.filter(x => x.image);
  const idx = imageMessages.findIndex(x => x.id == message.id);
  document.querySelector('main').appendChild(
    document.querySelector('#tmpl-modal-image').content.cloneNode(true)
  );
  document.querySelector('#modal img').src = message.image;
  (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot') || []).forEach(($close) => {
    $close.addEventListener('click', () => {
      document.querySelector('#modal').remove();
    });
  });
  console.log(idx);
  if (idx == 0) {
    document.querySelector('#btn-modal-back').disabled = true;
  } else {
    document.querySelector('#btn-modal-back').addEventListener('click', (e) => { document.querySelector('#modal').remove(); showImageModal(imageMessages[idx - 1]); });
  }
  if (idx == imageMessages.length - 1) {
    document.querySelector('#btn-modal-next').disabled = true;
  } else {
    document.querySelector('#btn-modal-next').addEventListener('click', (e) => { document.querySelector('#modal').remove(); showImageModal(imageMessages[idx + 1]); });
  }
  const d = new Date(message.sentAt);
  document.querySelector('.modal-timestamp').textContent = d.toLocaleString();
  getUser(message.sender)
    .then((sender) => {
      document.querySelector('.modal-sender').textContent = sender.name;
    });

};

function refreshMessageContent(message) {
  const messageHtml = document.querySelector('.message-card[data-id="' + message.id + '"]')
  const newMessageHtml = document.querySelector('#tmpl-message-content').content.cloneNode(true);
  messageHtml.replaceChildren(newMessageHtml);
  if (message.image) {
    const a = document.createElement('a');
    const img = document.createElement('img');
    img.src = message.image;
    img.alt = 'User submitted image';
    a.appendChild(img);

    a.addEventListener('click', (e) => showImageModal(message));
    messageHtml.querySelector('.content').appendChild(a);

  } else {
    messageHtml.querySelector('.message-content').textContent = message.message;
  }
  const d = new Date(message.sentAt);
  messageHtml.querySelector('.message-timestamp').textContent = d.toLocaleString();

  if (message.editedAt) {
    const d2 = new Date(message.sentAt);
    messageHtml.querySelector('.message-edited-timestamp').textContent = 'Edited: ' + d2.toLocaleString();
  }

  if (message.pinned) {
    messageHtml.querySelector('.message-pin').textContent = 'Unpin';
    document.querySelector('.message-card[data-id="' + message.id + '"]').classList.add("pinned");
    document.querySelector('.message-card[data-id="' + message.id + '"]').classList.remove("unpinned");
    messageHtml.querySelector('.message-pin').addEventListener('click', function (event) {

      const channel = window.location.hash.replace("#channel=", "");
      fetch(BACKEND_ROOT + 'message/unpin/' + channel + '/' + message.id, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Accept': 'application/json'
        },
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            const idx = messageCache.findIndex(x => x.id == message.id);
            messageCache[idx].pinned = false;
            refreshMessageContent(messageCache[idx]);
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    });
  } else {
    messageHtml.querySelector('.message-pin').textContent = 'Pin';
    document.querySelector('.message-card[data-id="' + message.id + '"]').classList.remove("pinned");
    document.querySelector('.message-card[data-id="' + message.id + '"]').classList.add("unpinned");
    messageHtml.querySelector('.message-pin').addEventListener('click', function (event) {

      const channel = window.location.hash.replace("#channel=", "");
      fetch(BACKEND_ROOT + 'message/pin/' + channel + '/' + message.id, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Accept': 'application/json'
        },
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            const idx = messageCache.findIndex(x => x.id == message.id);
            messageCache[idx].pinned = true;
            refreshMessageContent(messageCache[idx]);
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    });
  }

  if (user.userId == message.sender) {
    messageHtml.querySelector('.message-edit').addEventListener('click', function (event) {
      handleEditMessage(message);
    });
    messageHtml.querySelector('.message-delete').addEventListener('click', function (event) {
      const channel = window.location.hash.replace("#channel=", "");
      fetch(BACKEND_ROOT + 'message/' + channel + '/' + message.id, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Accept': 'application/json'
        },
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            messageCache = messageCache.filter(m => m.id != message.id);
            document.querySelector('.message-card[data-id="' + message.id + '"]').remove();

          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    });

  } else {
    messageHtml.querySelector('.message-edit').remove();
    messageHtml.querySelector('.message-delete').remove();
  }

  const reacts = messageHtml.querySelectorAll('.react');



  reacts.forEach(x => {
    //console.log(message.reacts);
    const thisReacts = message.reacts.filter(m => m.react == x.dataset.id);
    x.querySelector(".react-count").textContent = thisReacts.length;

    if (thisReacts.map(x => x.user).includes(user.userId)) {
      x.classList.add("reacted");
      x.addEventListener('click', function (event) {
        console.log(event.currentTarget);
        const channel = window.location.hash.replace("#channel=", "");
        fetch(BACKEND_ROOT + 'message/unreact/' + channel + '/' + message.id, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ "react": event.currentTarget.dataset.id }),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              loadMessages(channel).then(x => {
                refreshMessageContent(messageCache.find(m => m.id == message.id));
              }
              )
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      });
    } else {
      x.addEventListener('click', function (event) {

        const channel = window.location.hash.replace("#channel=", "");
        fetch(BACKEND_ROOT + 'message/react/' + channel + '/' + message.id, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ "react": event.currentTarget.dataset.id }),
        })
          .then((response) => response.json().then(data => ({ status: response.status, data })))
          .then((response) => {
            if (response.status == 200) {
              loadMessages(channel).then(x => {
                refreshMessageContent(messageCache.find(m => m.id == message.id));
              }
              )
            } else {
              showModal(response.data.error);
            }
          })
          .catch((error) => {
            showModal(error);
          });
      });

    }
  });

  messageHtml.querySelector('.message-sender').href = '/#profile=' + message.sender;
  getUser(message.sender)
    .then((sender) => {

      messageHtml.querySelector('.message-sender').textContent = sender.name;

      if (sender.image) {
        messageHtml.querySelector('.message-sender-profile-photo').src = sender.image;
        messageHtml.querySelector('.message-sender-profile-photo-2').src = sender.image;
      }

    });

}
function loadMessages(id) {
  return loadMessagesRemote(id)
    .then(() => {
      console.log('Setting cache');
      const transaction = db.transaction(["cache"], "readwrite");
      const objectStore = transaction.objectStore("cache");
      const request = objectStore.put({ key: 0, value: messageCache });
      request.onsuccess = (event) => {
        console.log("added cache");
      };
      //window.localStorage.setItem('messageCache',JSON.stringify(messageCache)) 
      return;
    }
    )
    .catch(() => {
      console.log('Loading cache...');
      const transaction = db.transaction(["cache"]);
      const objectStore = transaction.objectStore("cache");
      const request = objectStore.get(0);
      request.onsuccess = (event) => {
        console.log("retrieved cache");
        messageCache = event.target.result.value;
      };
    })
    ;
}
function loadMessagesRemote(id, lastLoaded = 0) {
  return fetch(BACKEND_ROOT + 'message/' + id + '?start=' + lastLoaded, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'Accept': 'application/json'
    },
  })
    .then((response) => response.json())
    .then((messages) => {
      console.log(messages);
      for (const newMessage of messages.messages) {
        const messageCacheIdx = messageCache.findIndex(x => x.id == newMessage.id)
        if (messageCacheIdx >= 0) {
          //console.log(messageCacheIdx);
          messageCache[messageCacheIdx] = newMessage;
        } else {
          const messageCacheIdx2 = messageCache.findIndex(x => x.id < newMessage.id);
          if (messageCacheIdx2 >= 0) {
            messageCache.splice(messageCacheIdx2, 0, newMessage);
          } else {
            messageCache.push(newMessage);
          }
        }
      }
      //messageCache = messageCache.concat(messages.messages);
      //lastLoaded = lastLoaded + messages.messages.length;
      if (messages.messages.length > 0) {
        return loadMessagesRemote(id, lastLoaded + messages.messages.length);
      } else {
        return;
      }


    })


}

function loadEditChannel(id, name, description) {
  document.querySelector('#right').replaceChildren(
    document.querySelector('#tmpl-edit-channel').content.cloneNode(true)
  );
  document.querySelector('#channel-name-input').value = name;
  document.querySelector('#channel-description-input').value = description;
  document.querySelector('#right form').addEventListener('submit', function (event) {
    event.preventDefault();
    const formObj = {};
    const formData = new FormData(event.target);
    formData.forEach((value, key) => (formObj[key] = value));

    //console.log(JSON.stringify(formObj));
    if (!formObj['name']) {
      showModal('Please enter a name.');
    } else {
      if (!formObj['description']) {
        formObj['description'] = formObj['name'];
      }


      console.log(JSON.stringify(formObj));
      fetch(BACKEND_ROOT + 'channel/' + id, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            loadChannels();
            loadChannel(id);
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    }
  });
}

function loadInvite(id, existing_users) {
  document.querySelector('main').appendChild(
    document.querySelector('#tmpl-modal-invite').content.cloneNode(true)
  );
  (document.querySelectorAll('.modal-background, .modal-close, .modal-card-head .delete, .modal-card-foot') || []).forEach(($close) => {
    $close.addEventListener('click', () => {
      document.querySelector('#modal').remove();
    });
  });

  fetch(BACKEND_ROOT + 'user', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + user.token,
      'Accept': 'application/json'
    },
  })
    .then((response) => response.json())

    .then((data) => {
      const users = data.users.filter(x => !existing_users.includes(x.id)).map(x => getUser(x.id));


      Promise.all(users).then(options => {
        options.sort((a, b) => {
          if (a.name.toUpperCase() < b.name.toUpperCase()) {
            return -1;
          }
          if (a.name.toUpperCase() > b.name.toUpperCase()) {
            return 1;
          }
          return 0;
        });

        document.querySelector('#user-selection').replaceChildren(
          ...options.map(u => {
            const opti = document.createElement("option");
            console.log(u);
            opti.value = u.id;
            opti.appendChild(document.createTextNode(u.name));
            return opti
          }));
      });
    });
  document.querySelector('#invite-form').addEventListener('submit', function (event) {
    event.preventDefault();
    const userList = [];
    const formData = new FormData(event.target);
    formData.forEach((value, key) => userList.push(value));
    event.target.remove();
    const p = document.createElement('p');
    p.textContent = userList.length == 0 ? "Error: no users selected" : "Inviting...";
    document.querySelector(".modal-content .box").appendChild(p);
    userList.forEach(u => {

      fetch(BACKEND_ROOT + 'channel/' + id + '/invite', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 'userId': parseInt(u) })
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {

          getUser(u).then(ud => {
            const p2 = document.createElement('p');
            if (response.status == 200) {
              p2.textContent = ud.name + ': sucessfully invited';
            } else {
              p2.textContent = ud.name + ': ' + response.data.error;
            }

            document.querySelector(".modal-content .box").appendChild(p2);
          });
        })
        .catch(error => {
          getUser(u).then(ud => {
            const p2 = document.createElement('p');
            p2.textContent = ud.name + ': ' + error;
            document.querySelector(".modal-content .box").appendChild(p2);
          });

        })


    }
    )
  });
}

function loadMyProfile() {

  let email = '';
  document.querySelector('#right').replaceChildren(
    document.querySelector('#tmpl-my-profile').content.cloneNode(true)
  );
  const fileInput = document.querySelector('#update-photo input[type="file"]');
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      document.querySelector('#update-photo .file-name').textContent = fileInput.files[0].name;
    }
  });
  getUser(user.userId).then(u => {

    document.querySelector('#update-details input[name=name]').value = u.name;
    document.querySelector('#update-details textarea[name=bio]').value = u.bio;
    document.querySelector('#update-details input[name=email]').value = u.email;
    if (u.image) {
      document.querySelector('#update-photo img').src = u.image;
    }
    email = u.email;
  });

  document.querySelector('#update-details').addEventListener('submit', function (event) {

    event.preventDefault();
    const formObj = {};
    const formData = new FormData(event.target);

    formData.forEach((value, key) => (formObj[key] = value));
    console.log(formObj);
    if (formData.get("email") == '') {
      showModal('Email is required.');
    } else {
      if (formObj.email == email) {
        delete formObj.email;
      }
      fetch(BACKEND_ROOT + 'USER', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            window.localStorage.removeItem('user-' + user.userId);
            showModal('Updated');
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    }
  });

  document.querySelector('#update-photo').addEventListener('submit', function (event) {

    event.preventDefault();
    const file = document.querySelector('#update-photo input[type="file"]').files[0];

    fileToDataUrl(file).then(fileUrl => {
      fetch(BACKEND_ROOT + 'USER', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 'image': fileUrl }),
      })
      .then((response) => response.json().then(data => ({ status: response.status, data })))
      .then((response) => {
        if (response.status == 200) {
          window.localStorage.removeItem('user-' + user.userId);
          showModal('Updated');
          document.querySelector('#update-photo .file-name').textContent = '';
          fileToDataUrl(file).then(fileUrl => { document.querySelector('#update-photo img').src = fileUrl; });
        } else {
          showModal(response.data.error);
        }
      })
      .catch((error) => {
        showModal(error);
      });
    });

  });

  document.querySelector('#update-password .icon').addEventListener('click', function (event) {
    console.log('123');
    if(document.querySelector('#update-password .control input').type == 'password'){
      document.querySelector('#update-password .control input').type = 'text';
      document.querySelector('#update-password .fas').className = 'fas fa-eye-slash';
    } else {
      document.querySelector('#update-password .control input').type = 'password';
      document.querySelector('#update-password .fas').className = 'fas fa-eye';
    }
  });
  document.querySelector('#update-password').addEventListener('submit', function (event) {

    event.preventDefault();
    const formObj = {};
    const formData = new FormData(event.target);

    formData.forEach((value, key) => (formObj[key] = value));
    console.log(formObj);
    if (formData.get("password") == '') {
      showModal('Password is required.');
    } else {

      fetch(BACKEND_ROOT + 'USER', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + user.token,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(formObj),
      })
        .then((response) => response.json().then(data => ({ status: response.status, data })))
        .then((response) => {
          if (response.status == 200) {
            window.localStorage.removeItem('user-' + user.userId);
            showModal('Updated');
          } else {
            showModal(response.data.error);
          }
        })
        .catch((error) => {
          showModal(error);
        });
    }
  });
}

function loadProfile(id) {


  document.querySelector('#right').replaceChildren(
    document.querySelector('#tmpl-view-profile').content.cloneNode(true)
  );

  getUser(id).then(u => {

    document.querySelector('#profile-name').textContent = u.name;
    document.querySelector('#profile-bio').textContent = u.bio;
    document.querySelector('#profile-email').textContent = u.email;
    if (u.image) {
      document.querySelector('#profile-photo').src = u.image;
    }

  });
  //document.querySelector('#right').replaceChildren(h3,p,btn);
}
window.addEventListener('hashchange', () => {
  resolveHash();
}, false);

function resolveHash() {
  if (window.location.hash.startsWith("#channel=")) {
    loadChannel(window.location.hash.replace("#channel=", ""));
  } else if (window.location.hash == "#profile") {
    loadMyProfile();
  } else if (window.location.hash.startsWith("#profile=")) {
    loadProfile(window.location.hash.replace("#profile=", ""));
  }

}

function initDB() {
  const request = window.indexedDB.open("slacker", 1);
  request.onerror = function (event) {
    console.error(event);
  };
  request.onsuccess = function (event) {
    db = event.target.result;
  };
  request.onupgradeneeded = function (event) {
    event.target.result.createObjectStore("cache", { keyPath: "key" });

  };
}

function initNotifications(latestMessage = null) {

  let channels = JSON.parse(window.localStorage.getItem('channelsCache')).channels;
  channels = channels.filter(x => x.members.includes(user.userId));
  if (channels) {
    let allResponses = [];
    if (latestMessage == null) {
      latestMessage = 0;
      for (const channel of channels) {
        allResponses.push(fetch(BACKEND_ROOT + 'message/' + channel.id + '?start=0', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Accept': 'application/json'
          },
        })
          .then((response) => response.json())
          .then((messages) => {
            if (messages.messages.length > 0 && messages.messages[0].id > latestMessage) {
              latestMessage = messages.messages[0].id;
            }
          }
          ));
      }
      Promise.all(allResponses).then(x => setTimeout(() => { initNotifications(latestMessage) }, 10000));
    } else {
      let newLatestMessage = latestMessage;
      for (const channel of channels) {

        allResponses.push(fetch(BACKEND_ROOT + 'message/' + channel.id + '?start=0', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer ' + user.token,
            'Accept': 'application/json'
          },
        })
          .then((response) => response.json())
          .then((messages) => {
            console.log(messages);
            for (const message of messages.messages) {
              console.log(message.id);
              console.log(latestMessage);
              if (message.sender != user.userId && message.id > latestMessage) {

                getUser(message.sender).then(u => {
                  new Notification("New message in " + channel.name + " from " + u.name, { body: message.message, image: message.image });
                }
                );
              }
              if (message.id > newLatestMessage) {
                newLatestMessage = message.id;
              }
            }
          }
          ));
      }
      Promise.all(allResponses).then(x => setTimeout(() => { initNotifications(newLatestMessage) }, 10000));
    }

  }
}