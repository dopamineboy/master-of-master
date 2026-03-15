/**
 * 1) 캐릭터 생성  2) 채널 입장 온보딩 (채팅, 알림, 밭/광장/장터)
 */
(function () {
  const JOB_CONFIG = {
    farmer:   { label: '농부',   icon: '🌾', previewClass: 'farmer' },
    fisherman: { label: '낚시꾼', icon: '🎣', previewClass: 'fisherman' },
    miner:   { label: '광부',   icon: '⛏️', previewClass: 'miner' },
    merchant: { label: '장사꾼', icon: '💰', previewClass: 'merchant' }
  };
  /* 직업별 첫 번째 섹터만 다름(밭/호수/광산/창고), 광장·장터는 공통 */
  const SECTOR_BY_JOB = {
    farmer:   [{ sector: 'farm',   name: '밭',   icon: '🌾' }, { sector: 'plaza', name: '광장', icon: '🏛️' }, { sector: 'market', name: '장터', icon: '🏪' }],
    fisherman: [{ sector: 'farm', name: '호수', icon: '🌊' }, { sector: 'plaza', name: '광장', icon: '🏛️' }, { sector: 'market', name: '장터', icon: '🏪' }],
    miner:   [{ sector: 'farm',   name: '광산', icon: '⛏️' }, { sector: 'plaza', name: '광장', icon: '🏛️' }, { sector: 'market', name: '장터', icon: '🏪' }],
    merchant: [{ sector: 'farm', name: '창고', icon: '📦' }, { sector: 'plaza', name: '광장', icon: '🏛️' }, { sector: 'market', name: '장터', icon: '🏪' }]
  };
  const NOTICES = [
    {
      title: '📖 플레이 가이드',
      isGuide: true,
      body: '<div class="notice-guide-body">' +
        '<p><strong>1. 시작하기</strong><br>아이디·비밀번호 설정 후 캐릭터 생성. 직업은 랜덤(농부/낚시꾼/광부/장사꾼).</p>' +
        '<p><strong>2. 화면</strong><br>지도에서 밭·광장·장터 이동. 밭에서 직업별 행동(채집/낚시/채광/장사) 수행.</p>' +
        '<p><strong>3. 에너지</strong><br>행동 시 에너지 2 소모. <em>매일 오전 12:00(자정)</em>에 자동 리셋.</p>' +
        '<p><strong>4. 가방</strong><br>탭별 아이템 확인, 전부 판매 가능.</p>' +
        '<p><strong>5. 장터</strong><br>일반판매 / 상인조합(농부·어부·광부 판매→장사꾼 구매) / 상인판매(장사꾼 등록·모두 구매).</p>' +
        '<p><strong>6. 광장</strong><br>철수 vs 영희 배팅(30~100G, 30분마다). 2배·6배 배당.</p>' +
        '<p><strong>7. 강화·조합</strong><br>계약서 조합(10→1), 크로스조합(레어+일반).</p>' +
        '<p><strong>8. 팁</strong><br>에너지는 자정 리셋. 장사꾼은 상인조합→재판매. 레어·유니크는 크로스조합 재료.</p>' +
        '<p><strong>9. 문제</strong><br>버튼 비활성→에너지 2 이상. 칭호→계약서 확인.</p>' +
        '</div>'
    },
    { title: '채널에 오신 걸 환영합니다', body: '각 구역을 눌러 이동할 수 있습니다.' }
  ];

  const createScreen = document.getElementById('create-screen');
  const channelScreen = document.getElementById('channel-screen');
  const accountIdInput = document.getElementById('account-id-input');
  const btnCheckId = document.getElementById('btn-check-id');
  const checkIdResult = document.getElementById('check-id-result');
  const passwordInput = document.getElementById('password-input');
  const btnCreate = document.getElementById('btn-create');
  const createError = document.getElementById('create-error');
  const loginModal = document.getElementById('login-modal');
  const loginIdInput = document.getElementById('login-id-input');
  const loginPasswordInput = document.getElementById('login-password-input');
  const loginError = document.getElementById('login-error');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const btnLoginCancel = document.getElementById('btn-login-cancel');
  const btnShowLogin = document.getElementById('btn-show-login');
  let idCheckedOk = false;
  const channelMessage = document.getElementById('channel-message');
  const channelMap = document.getElementById('channel-map');
  const sectorView = document.getElementById('sector-view');
  const sectorContent = document.getElementById('sector-content');
  const sectorPlaceholder = document.getElementById('sector-placeholder');
  const btnBackMap = document.getElementById('btn-back-map');
  const activityZone = document.getElementById('activity-zone');
  const activityAnim = document.getElementById('activity-anim');
  const btnActivity = document.getElementById('btn-activity');
  const activityResult = document.getElementById('activity-result');
  const energyGaugeFill = document.getElementById('energy-gauge-fill');
  const energyGaugeText = document.getElementById('energy-gauge-text');
  const btnChat = document.getElementById('btn-chat');
  const btnNotice = document.getElementById('btn-notice');
  const panelChat = document.getElementById('panel-chat');
  const panelNotice = document.getElementById('panel-notice');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');
  const noticeList = document.getElementById('notice-list');
  const panelBackdrop = document.getElementById('panel-backdrop');
  const btnMyinfo = document.getElementById('btn-myinfo');
  const btnBag = document.getElementById('btn-bag');
  const btnLogout = document.getElementById('btn-logout');
  const panelMyinfo = document.getElementById('panel-myinfo');
  const panelBag = document.getElementById('panel-bag');
  const myinfoTitle = document.getElementById('myinfo-title');
  const myinfoGold = document.getElementById('myinfo-gold');
  const myinfoAccount = document.getElementById('myinfo-account');
  const bagContent = document.getElementById('bag-content');

  const JOB_LABELS_FOR_BAG = { farmer: '농부 아이템', fisherman: '낚시꾼 아이템', miner: '광부 아이템', contract: '계약서', box: '상자', consumable: '소비 아이템', merchant: '장사꾼 아이템' };
  const ACTIVITY_BY_JOB = {
    farmer:   { cmd: '채집', label: '채집하기', busy: '채집중입니다', emoji: '🌾', animClass: 'farm', duration: 5000 },
    fisherman: { cmd: '낚시', label: '낚시하기', busy: '낚시중입니다', emoji: '🎣', animClass: 'fishing', duration: 5000 },
    miner:   { cmd: '채광', label: '채광하기', busy: '채광중입니다', emoji: '⛏️', animClass: 'mining', duration: 5000 },
    merchant: { cmd: '장사', label: '장사하기', busy: '장사중입니다', emoji: '💰', animClass: 'selling', duration: 10000 }
  };

  let currentJobLabel = '농부';
  let myChannel = 'farmer';
  let myNickname = '';
  let chatLog = [];
  let chatWs = null;
  let channelState = null;

  function api(method, url, body) {
    var opts = { method: method, credentials: 'include' };
    if (body) {
      opts.headers = { 'Content-Type': 'application/json' };
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) { return r.json(); });
  }

  function getSectorName(job, sectorId) {
    var list = SECTOR_BY_JOB[job] || SECTOR_BY_JOB.farmer;
    var item = list.find(function (s) { return s.sector === sectorId; });
    return item ? item.name : sectorId;
  }

  function updateSectorLabels(job) {
    var list = SECTOR_BY_JOB[job] || SECTOR_BY_JOB.farmer;
    list.forEach(function (item) {
      var btn = document.querySelector('.sector-btn[data-sector="' + item.sector + '"]');
      if (!btn) return;
      var iconEl = btn.querySelector('.sector-icon');
      var nameEl = btn.querySelector('.sector-name');
      if (iconEl) iconEl.textContent = item.icon;
      if (nameEl) nameEl.textContent = item.name;
    });
  }

  const JOB_SLAVE_LABELS = { farmer: '채집노예', fisherman: '낚시노예', miner: '채광노예', merchant: '창고노예' };
  const JOB_WELCOME_ICONS = { farmer: '🌾', fisherman: '🎣', miner: '⛏️', merchant: '💰' };
  function showWelcomeOverlay(job) {
    var overlay = document.getElementById('welcome-overlay');
    var titleEl = document.getElementById('welcome-title');
    var iconEl = document.getElementById('welcome-icon');
    var subEl = document.getElementById('welcome-sub');
    if (!overlay || !titleEl || !iconEl || !subEl) return;
    var slaveLabel = JOB_SLAVE_LABELS[job] || '노예';
    var icon = JOB_WELCOME_ICONS[job] || '🎉';
    titleEl.textContent = '축하합니다!';
    iconEl.textContent = icon;
    subEl.textContent = slaveLabel + '로 태어났습니다.';
    subEl.className = 'welcome-sub welcome-job-' + (job || 'farmer');
    overlay.classList.remove('hidden');
    overlay.classList.add('welcome-visible');
    setTimeout(function () {
      overlay.classList.remove('welcome-visible');
      setTimeout(function () { overlay.classList.add('hidden'); }, 500);
    }, 3500);
  }
  function showChannelScreen(job, nickname, isFirstEntry) {
    currentJobLabel = JOB_CONFIG[job] ? JOB_CONFIG[job].label : job;
    myChannel = (job && JOB_CONFIG[job]) ? job : 'farmer';
    myNickname = nickname || '손님';
    channelMessage.textContent = currentJobLabel + ' 채널에 입장하셨습니다.';
    updateSectorLabels(myChannel);
    channelScreen.classList.remove('channel-farmer', 'channel-fisherman', 'channel-miner', 'channel-merchant');
    channelScreen.classList.add('channel-' + myChannel);
    createScreen.classList.remove('active');
    channelScreen.classList.add('active');
    connectChat();
    fetchChannelState();
    if (isFirstEntry) showWelcomeOverlay(job);
  }

  function fetchChannelState() {
    api('GET', '/api/state').then(function (data) {
      if (data && data.state) {
        channelState = data.state;
        updateEnergyGauge(channelState);
        updateAdminVisibility();
      }
    });
  }
  function updateAdminVisibility() {
    var btnAdmin = document.getElementById('btn-admin');
    if (btnAdmin) {
      btnAdmin.classList.toggle('hidden', !(channelState && channelState.isAdmin));
    }
  }

  function updateEnergyGauge(s) {
    if (!s || !energyGaugeFill) return;
    var max = s.maxEnergy || 100;
    var cur = s.energy != null ? s.energy : 0;
    var pct = max ? (cur / max) * 100 : 0;
    energyGaugeFill.style.width = pct + '%';
    energyGaugeFill.classList.toggle('low', pct <= 20 && pct > 0);
    if (energyGaugeText) energyGaugeText.textContent = cur + '/' + max;
  }

  function openMyinfo() {
    api('GET', '/api/state').then(function (data) {
      if (data && data.state) {
        channelState = data.state;
        updateEnergyGauge(channelState);
      }
      if (channelState) {
        if (myinfoAccount) myinfoAccount.textContent = channelState.accountId || '-';
        myinfoTitle.textContent = channelState.title || '평민';
        myinfoGold.textContent = channelState.gold != null ? channelState.gold : 0;
        var jobType = channelState.characterType;
        var actRow = document.getElementById('myinfo-activity-row');
        var actVal = document.getElementById('myinfo-activity');
        var nextRow = document.getElementById('myinfo-next-title-row');
        var nextEl = document.getElementById('myinfo-next-title');
        if (jobType === 'farmer' || jobType === 'fisherman' || jobType === 'miner') {
          actRow.classList.remove('hidden');
          var label = jobType === 'farmer' ? '채집' : jobType === 'fisherman' ? '낚시' : '채광';
          var count = jobType === 'farmer' ? (channelState.harvestCount || 0) : jobType === 'fisherman' ? (channelState.fishCount || 0) : (channelState.mineCount || 0);
          actVal.textContent = label + ' ' + count + '회';
          var req = channelState.nextTitleRequirement;
          if (req) {
            nextRow.classList.remove('hidden');
            nextEl.innerHTML = '<span class="next-title-name">' + req.name + '</span><br><span class="next-title-condition">' + req.activityLabel + ' ' + req.count + '회 + ' + req.contract + ' 1장</span><br><span class="next-title-progress">(' + req.current + ' / ' + req.count + ')</span>';
          } else {
            nextRow.classList.add('hidden');
          }
        } else if (jobType === 'merchant') {
          actRow.classList.remove('hidden');
          actVal.textContent = '상인조합 구매 ' + (channelState.merchantBuyTotal || 0) + ' G';
          var req = channelState.nextTitleRequirement;
          if (req) {
            nextRow.classList.remove('hidden');
            nextEl.innerHTML = '<span class="next-title-name">' + req.name + '</span><br><span class="next-title-condition">' + req.activityLabel + ' ' + req.count + 'G' + (req.contract ? ' + ' + req.contract + ' 1장' : '') + '</span><br><span class="next-title-progress">(' + req.current + ' / ' + req.count + ')</span>';
          } else {
            nextRow.classList.add('hidden');
          }
        } else {
          actRow.classList.add('hidden');
          nextRow.classList.add('hidden');
        }
      }
      openPanel(panelMyinfo);
    });
  }

  var CRAFT_RECIPES = [
    { targetId: 'contract_2', fromId: 'contract_1', need: 10, toName: '고급계약서', fromName: '일반계약서' },
    { targetId: 'contract_3', fromId: 'contract_2', need: 10, toName: '전문계약서', fromName: '고급계약서' },
    { targetId: 'contract_4', fromId: 'contract_3', need: 10, toName: '명인계약서', fromName: '전문계약서' },
    { targetId: 'contract_5', fromId: 'contract_4', need: 10, toName: '마스터계약서', fromName: '명인계약서' }
  ];
  function openBag() {
    api('GET', '/api/state').then(function (data) {
      if (data && data.state) {
        channelState = data.state;
        updateEnergyGauge(channelState);
      }
      if (!channelState || !channelState.inventoryList || channelState.inventoryList.length === 0) {
        bagContent.innerHTML = '<p class="bag-empty">아이템이 없습니다.</p>';
      } else {
        var inv = channelState.inventory || {};
        var list = channelState.inventoryList;
        var byJob = {};
        list.forEach(function (item) {
          var j = item.job || 'fisherman';
          if (!byJob[j]) byJob[j] = [];
          byJob[j].push(item);
        });
        var order = ['farmer', 'fisherman', 'miner', 'contract', 'box', 'consumable', 'merchant'];
        var html = '';
        order.forEach(function (job) {
          var items = byJob[job];
          if (!items || items.length === 0) return;
          html += '<div class="bag-job-group"><div class="bag-job-title">' + (JOB_LABELS_FOR_BAG[job] || job) + '</div><ul class="bag-item-list">';
          items.forEach(function (it) {
            var goldSpan = (job === 'contract' || job === 'consumable' || (it.gold != null && it.gold === 0)) ? '' : '<span class="item-gold">' + it.gold + ' G</span>';
            var actionBtn = '';
            if (it.id === 'lotto_box') {
              actionBtn = '<button type="button" class="btn-bag-action btn-open-lotto" data-action="로또상자열기"><span class="btn-lotto-icon">📦</span> 열기</button>';
            } else if (it.id === 'energy_drink') {
              actionBtn = '<button type="button" class="btn-bag-action btn-use-energy" data-action="에너지드링크사용"><span class="btn-energy-icon">⚡</span> 사용</button>';
            } else if (it.id === 'super_food') {
              actionBtn = '<button type="button" class="btn-bag-action" data-action="슈퍼푸드사용"><span>🍖</span> 사용</button>';
            }
            html += '<li><span>' + it.name + ' x' + it.count + '</span>' + goldSpan + (actionBtn ? ' ' + actionBtn : '') + '</li>';
          });
          html += '</ul></div>';
        });
        html += '<div class="bag-craft-section"><div class="bag-job-title">계약서 조합</div><div class="bag-craft-list">';
        CRAFT_RECIPES.forEach(function (rec) {
          var have = inv[rec.fromId] || 0;
          var canCraft = have >= rec.need;
          html += '<div class="bag-craft-item">';
          html += '<span>' + rec.fromName + ' ' + rec.need + '장 → ' + rec.toName + ' 1장</span>';
          html += '<span class="craft-have">(보유 ' + have + '장)</span>';
          html += canCraft ? '<button type="button" class="btn-craft" data-target="' + rec.targetId + '">조합</button>' : '<button type="button" class="btn-craft" disabled>조합</button>';
          html += '</div>';
        });
        html += '</div></div>';
        html += '<div class="bag-craft-section"><div class="bag-job-title">크로스 조합</div><div class="bag-craft-list">';
        [
          { targetId: 'super_food', label: '슈퍼푸드 (농부레어5+어부일반10)' },
          { targetId: 'job_contract', label: '이직계약서 (어부레어5+농부일반10)' }
        ].forEach(function (r) {
          html += '<div class="bag-craft-item"><span>' + r.label + '</span><button type="button" class="btn-craft btn-cross-craft" data-craft-target="' + r.targetId + '">조합</button></div>';
        });
        html += '</div></div></div>';
        bagContent.innerHTML = html || '<p class="bag-empty">아이템이 없습니다.</p>';
        bagContent.querySelectorAll('.btn-craft:not([disabled])').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var target = btn.getAttribute('data-target');
            var craftTarget = btn.getAttribute('data-craft-target');
            var action = btn.getAttribute('data-action');
            var apiAction = target ? '계약서조합' : (craftTarget ? '크로스조합' : action);
            var body = target ? { action: '계약서조합', targetId: target } : (craftTarget ? { action: '크로스조합', craftTarget: craftTarget } : (action ? { action: action } : {}));
            api('POST', '/api/command', body)
              .then(function (res) {
                if (res.state) {
                  channelState = res.state;
                  updateEnergyGauge(res.state);
                }
                openBag();
              });
          });
        });
        bagContent.querySelectorAll('.btn-bag-action').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var action = btn.getAttribute('data-action');
            if (!action) return;
            api('POST', '/api/command', { action: action })
              .then(function (res) {
                if (res.state) {
                  channelState = res.state;
                  updateEnergyGauge(res.state);
                }
                if (action === '로또상자열기' && res.lottoOpen) {
                  showLottoResultOverlay(res.lottoOpen, openBag);
                } else {
                  openBag();
                }
              });
          });
        });
      }
      openPanel(panelBag);
    });
  }

  function connectChat() {
    if (chatWs && chatWs.readyState === 1) return;
    var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    var url = proto + '//' + location.host;
    try {
      chatWs = new WebSocket(url);
      chatWs.onopen = function () {
        chatWs.send(JSON.stringify({ type: 'join', channel: myChannel, nickname: myNickname }));
      };
      chatWs.onmessage = function (ev) {
        try {
          var data = JSON.parse(ev.data);
          if (data.type === 'history') {
            (data.messages || []).forEach(function (m) {
              chatLog.push({ mine: false, text: m.text, nickname: m.nickname, system: false });
            });
            renderChat();
            return;
          }
          if (data.type === 'message') {
            chatLog.push({ mine: false, text: data.text, nickname: data.nickname, system: false });
            renderChat();
            return;
          }
          if (data.type === 'system') {
            chatLog.push({ mine: false, text: data.text, system: true });
            renderChat();
          }
          if (data.type === 'gamble') {
            if (currentSector === 'plaza' && plazaZone && !plazaZone.classList.contains('hidden')) {
              if (data.currentRound) {
                renderPlazaLiveBets(data.currentRound.bets, data.currentRound.totalByChoice);
                updatePlazaCountdown(data.currentRound.endTime);
              }
              if (data.event === 'resolved') {
                if (data.history) {
                  renderPlazaHistory(data.history);
                  renderPlazaWinnersBoard(data.history);
                }
                if (data.completed && data.completed.result) {
                  showPlazaResultOverlay(data.completed.result);
                }
              }
            }
          }
        } catch (e) {}
      };
      chatWs.onclose = function () {
        chatWs = null;
      };
      chatWs.onerror = function () {
        chatWs = null;
      };
    } catch (e) {
      chatWs = null;
    }
  }

  function renderChat() {
    chatMessages.innerHTML = '';
    chatLog.forEach(function (msg) {
      var li = document.createElement('li');
      if (msg.system) {
        li.className = 'system';
        li.textContent = msg.text;
      } else {
        li.className = msg.mine ? 'mine' : 'other';
        if (!msg.mine && msg.nickname) {
          var nameSpan = document.createElement('span');
          nameSpan.className = 'chat-nickname';
          nameSpan.textContent = msg.nickname + ': ';
          li.appendChild(nameSpan);
        }
        li.appendChild(document.createTextNode(msg.text));
      }
      chatMessages.appendChild(li);
    });
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function openPanel(panel) {
    panel.classList.add('open');
    if (panelBackdrop) {
      panelBackdrop.classList.remove('hidden');
      panelBackdrop.setAttribute('aria-hidden', 'false');
    }
  }
  var panelPlazaHistory = document.getElementById('panel-plaza-history');
  var panelPlazaLive = document.getElementById('panel-plaza-live');
  var panelAdmin = document.getElementById('panel-admin');
  function closePanel(panel) {
    if (panel) panel.classList.remove('open');
    var phOpen = panelPlazaHistory && panelPlazaHistory.classList.contains('open');
    var plOpen = panelPlazaLive && panelPlazaLive.classList.contains('open');
    var paOpen = panelAdmin && panelAdmin.classList.contains('open');
    if (panelBackdrop && !panelChat.classList.contains('open') && !panelNotice.classList.contains('open') && !panelMyinfo.classList.contains('open') && !panelBag.classList.contains('open') && !phOpen && !plOpen && !paOpen) {
      panelBackdrop.classList.add('hidden');
      panelBackdrop.setAttribute('aria-hidden', 'true');
    }
  }
  function closeAllPanels() {
    panelChat.classList.remove('open');
    panelNotice.classList.remove('open');
    if (panelMyinfo) panelMyinfo.classList.remove('open');
    if (panelBag) panelBag.classList.remove('open');
    if (panelPlazaHistory) panelPlazaHistory.classList.remove('open');
    if (panelPlazaLive) panelPlazaLive.classList.remove('open');
    if (panelAdmin) panelAdmin.classList.remove('open');
    if (panelBackdrop) {
      panelBackdrop.classList.add('hidden');
      panelBackdrop.setAttribute('aria-hidden', 'true');
    }
  }

  if (accountIdInput) accountIdInput.addEventListener('input', function () {
    idCheckedOk = false;
    if (checkIdResult) { checkIdResult.classList.add('hidden'); checkIdResult.textContent = ''; }
  });
  if (btnCheckId) {
    btnCheckId.addEventListener('click', function () {
      var id = (accountIdInput && accountIdInput.value || '').trim();
      if (typeof id.normalize === 'function') id = id.normalize('NFC');
      if (checkIdResult) checkIdResult.classList.add('hidden');
      if (!/^[\uAC00-\uD7A3a-zA-Z0-9]{2,12}$/.test(id)) {
        if (checkIdResult) {
          checkIdResult.textContent = '아이디는 2~12자(한글·영문·숫자)로 입력하세요.';
          checkIdResult.className = 'check-id-result err';
          checkIdResult.classList.remove('hidden');
        }
        return;
      }
      api('POST', '/api/command', { action: 'checkId', accountId: id }).then(function (res) {
        if (res.checkId && checkIdResult) {
          idCheckedOk = res.idAvailable;
          checkIdResult.textContent = res.idAvailable ? '사용 가능한 아이디입니다.' : (res.replyText || '이미 사용 중입니다.');
          checkIdResult.className = 'check-id-result' + (res.idAvailable ? ' ok' : ' err');
          checkIdResult.classList.remove('hidden');
        }
      }).catch(function () {
        if (checkIdResult) {
          checkIdResult.textContent = '서버에 연결할 수 없습니다.';
          checkIdResult.className = 'check-id-result err';
          checkIdResult.classList.remove('hidden');
        }
      });
    });
  }
  if (btnShowLogin) {
    btnShowLogin.addEventListener('click', function () {
      if (loginModal) {
        loginModal.classList.remove('hidden');
        if (loginIdInput) loginIdInput.value = '';
        if (loginPasswordInput) loginPasswordInput.value = '';
        if (loginError) { loginError.classList.add('hidden'); }
      }
    });
  }
  if (btnLoginCancel) {
    btnLoginCancel.addEventListener('click', function () {
      if (loginModal) loginModal.classList.add('hidden');
    });
  }
  if (btnLoginSubmit) {
    btnLoginSubmit.addEventListener('click', function () {
      var id = (loginIdInput && loginIdInput.value || '').trim();
      var pw = (loginPasswordInput && loginPasswordInput.value || '').trim();
      if (typeof id.normalize === 'function') id = id.normalize('NFC');
      if (typeof pw.normalize === 'function') pw = pw.normalize('NFC');
      if (loginError) loginError.classList.add('hidden');
      if (!id || !pw) {
        if (loginError) { loginError.textContent = '아이디와 비밀번호를 입력하세요.'; loginError.classList.remove('hidden'); }
        return;
      }
      api('POST', '/api/command', { action: 'login', accountId: id, password: pw })
        .then(function (res) {
          var displayName = (res.state && (res.state.characterName || res.state.accountId)) || '';
          if (res.login && res.state && displayName) {
            if (loginModal) loginModal.classList.add('hidden');
            showChannelScreen(res.state.characterType || 'farmer', displayName, false);
            channelState = res.state;
            updateEnergyGauge(channelState);
          } else {
            if (loginError) { loginError.textContent = res.replyText || res.error || '로그인에 실패했습니다.'; loginError.classList.remove('hidden'); }
          }
        })
        .catch(function () {
          if (loginError) { loginError.textContent = '서버에 연결할 수 없습니다.'; loginError.classList.remove('hidden'); }
        });
    });
  }

  function doLogout() {
    if (!channelScreen.classList.contains('active')) return;
    api('GET', '/api/logout').then(function (res) {
      if (res.logout) {
        closeAllPanels();
        if (chatWs && chatWs.readyState === 1) chatWs.close();
        chatWs = null;
        chatLog = [];
        channelState = null;
        channelScreen.classList.remove('active');
        createScreen.classList.add('active');
      }
    }).catch(function () {});
  }
  if (btnLogout) btnLogout.addEventListener('click', doLogout);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      doLogout();
    }
  });

  function loadAdminUsers(cb) {
    api('POST', '/api/command', { action: 'adminListUsers' }).then(function (res) {
      var users = (res.adminResult && res.adminResult.users) || [];
      var sel = document.getElementById('admin-target');
      if (sel) {
        var cur = sel.value;
        sel.innerHTML = '<option value="">— 선택 —</option>' + users.map(function (u) { return '<option value="' + u + '">' + u + '</option>'; }).join('');
        if (users.indexOf(cur) >= 0) sel.value = cur;
      }
      if (cb) cb();
    });
  }
  function loadAdminItems(cb) {
    api('POST', '/api/command', { action: 'adminGetItems' }).then(function (res) {
      var items = (res.adminResult && res.adminResult.items) || [];
      var opt = '<option value="">— 선택 —</option>' + items.map(function (it) { return '<option value="' + it.id + '">' + it.name + ' (' + it.id + ')</option>'; }).join('');
      var addSel = document.getElementById('admin-item-add');
      var setSel = document.getElementById('admin-item-set');
      if (addSel) addSel.innerHTML = opt;
      if (setSel) setSel.innerHTML = opt;
      if (cb) cb();
    });
  }
  function openAdminPanel() {
    loadAdminUsers(function () { loadAdminItems(function () { openPanel(panelAdmin); }); });
  }
  function showAdminResult(msg, isErr) {
    var el = document.getElementById('admin-result');
    if (el) { el.textContent = msg || ''; el.className = 'admin-result' + (isErr ? ' admin-result-err' : ''); }
  }
  var btnAdmin = document.getElementById('btn-admin');
  if (btnAdmin) btnAdmin.addEventListener('click', openAdminPanel);
  var adminRefreshBtn = document.getElementById('admin-refresh-users');
  if (adminRefreshBtn) adminRefreshBtn.addEventListener('click', loadAdminUsers);
  var adminChangeJobBtn = document.getElementById('admin-btn-change-job');
  if (adminChangeJobBtn) adminChangeJobBtn.addEventListener('click', function () {
    var target = document.getElementById('admin-target');
    var jobSel = document.getElementById('admin-job');
    if (!target || !target.value) { showAdminResult('대상 계정을 선택하세요.', true); return; }
    adminChangeJobBtn.disabled = true;
    api('POST', '/api/command', { action: 'adminChangeJob', targetAccountId: target.value, newJob: jobSel ? jobSel.value : 'farmer' })
      .then(function (res) {
        adminChangeJobBtn.disabled = false;
        showAdminResult(res.replyText || '완료');
        if (res.state) { channelState = res.state; updateEnergyGauge(channelState); }
      })
      .catch(function () { adminChangeJobBtn.disabled = false; showAdminResult('오류 발생', true); });
  });
  var adminSetGoldBtn = document.getElementById('admin-btn-set-gold');
  if (adminSetGoldBtn) adminSetGoldBtn.addEventListener('click', function () {
    var target = document.getElementById('admin-target');
    var goldInp = document.getElementById('admin-gold');
    var gold = goldInp ? parseInt(goldInp.value, 10) : 0;
    if (!target || !target.value) { showAdminResult('대상 계정을 선택하세요.', true); return; }
    if (isNaN(gold) || gold < 0) { showAdminResult('골드는 0 이상이어야 합니다.', true); return; }
    adminSetGoldBtn.disabled = true;
    api('POST', '/api/command', { action: 'adminSetGold', targetAccountId: target.value, gold: gold })
      .then(function (res) {
        adminSetGoldBtn.disabled = false;
        showAdminResult(res.replyText || '완료');
        if (res.state) { channelState = res.state; updateEnergyGauge(channelState); }
      })
      .catch(function () { adminSetGoldBtn.disabled = false; showAdminResult('오류 발생', true); });
  });
  var adminAddItemBtn = document.getElementById('admin-btn-add-item');
  if (adminAddItemBtn) adminAddItemBtn.addEventListener('click', function () {
    var target = document.getElementById('admin-target');
    var itemSel = document.getElementById('admin-item-add');
    var countInp = document.getElementById('admin-item-add-count');
    var count = countInp ? parseInt(countInp.value, 10) || 1 : 1;
    if (!target || !target.value) { showAdminResult('대상 계정을 선택하세요.', true); return; }
    if (!itemSel || !itemSel.value) { showAdminResult('아이템을 선택하세요.', true); return; }
    adminAddItemBtn.disabled = true;
    api('POST', '/api/command', { action: 'adminAddItem', targetAccountId: target.value, itemId: itemSel.value, count: count })
      .then(function (res) {
        adminAddItemBtn.disabled = false;
        showAdminResult(res.replyText || '완료');
        if (res.state) { channelState = res.state; }
      })
      .catch(function () { adminAddItemBtn.disabled = false; showAdminResult('오류 발생', true); });
  });
  var adminSetItemBtn = document.getElementById('admin-btn-set-item');
  if (adminSetItemBtn) adminSetItemBtn.addEventListener('click', function () {
    var target = document.getElementById('admin-target');
    var itemSel = document.getElementById('admin-item-set');
    var countInp = document.getElementById('admin-item-set-count');
    var count = countInp ? parseInt(countInp.value, 10) : 0;
    if (!target || !target.value) { showAdminResult('대상 계정을 선택하세요.', true); return; }
    if (!itemSel || !itemSel.value) { showAdminResult('아이템을 선택하세요.', true); return; }
    if (isNaN(count) || count < 0) { showAdminResult('개수는 0 이상이어야 합니다.', true); return; }
    adminSetItemBtn.disabled = true;
    api('POST', '/api/command', { action: 'adminSetItem', targetAccountId: target.value, itemId: itemSel.value, count: count })
      .then(function (res) {
        adminSetItemBtn.disabled = false;
        showAdminResult(res.replyText || '완료');
        if (res.state) { channelState = res.state; }
      })
      .catch(function () { adminSetItemBtn.disabled = false; showAdminResult('오류 발생', true); });
  });

  btnCreate.addEventListener('click', function () {
    var accountId = (accountIdInput && accountIdInput.value || '').trim();
    var password = (passwordInput && passwordInput.value || '').trim();
    if (typeof accountId.normalize === 'function') accountId = accountId.normalize('NFC');
    if (typeof password.normalize === 'function') password = password.normalize('NFC');
    createError.classList.add('hidden');
    if (!idCheckedOk) {
      createError.textContent = '아이디 중복확인을 먼저 해 주세요.';
      createError.classList.remove('hidden');
      return;
    }
    if (!/^[\uAC00-\uD7A3a-zA-Z0-9]{2,12}$/.test(accountId)) {
      createError.textContent = '아이디는 2~12자(한글·영문·숫자)로 입력하세요.';
      createError.classList.remove('hidden');
      return;
    }
    if (!/^[\uAC00-\uD7A3a-zA-Z0-9]{1,8}$/.test(password)) {
      createError.textContent = '비밀번호는 8자 이내(한글·영문·숫자)로 입력하세요.';
      createError.classList.remove('hidden');
      return;
    }
    btnCreate.disabled = true;
    api('POST', '/api/command', { action: 'createAccount', accountId: accountId, password: password })
      .then(function (res) {
        btnCreate.disabled = false;
        var displayName = (res.state && (res.state.characterName || res.state.accountId)) || '';
        if (res.createAccount && res.state && displayName) {
          showChannelScreen(res.state.characterType || 'farmer', displayName, true);
          channelState = res.state;
          updateEnergyGauge(channelState);
          updateBattleUI(channelState);
        } else {
          var errMsg = res.replyText || res.error || '생성에 실패했습니다.';
          createError.textContent = errMsg;
          createError.classList.remove('hidden');
        }
      })
      .catch(function () {
        btnCreate.disabled = false;
        createError.textContent = '서버에 연결할 수 없습니다.';
        createError.classList.remove('hidden');
      });
  });

  btnMyinfo.addEventListener('click', openMyinfo);
  btnBag.addEventListener('click', openBag);
  btnChat.addEventListener('click', function () { openPanel(panelChat); });
  btnNotice.addEventListener('click', function () { openPanel(panelNotice); });

  function doLogout() {
    if (!channelScreen || !channelScreen.classList.contains('active')) return;
    api('GET', '/api/logout').then(function (data) {
      if (data && data.logout) {
        if (chatWs) { chatWs.close(); chatWs = null; }
        closeAllPanels();
        channelScreen.classList.remove('active');
        createScreen.classList.add('active');
        channelState = null;
        chatLog = [];
      }
    });
  }
  if (btnLogout) btnLogout.addEventListener('click', doLogout);
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'L') {
      e.preventDefault();
      doLogout();
    }
  });
  document.querySelectorAll('.panel-close').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-close');
      if (id) closePanel(document.getElementById(id));
    });
  });
  if (panelBackdrop) {
    panelBackdrop.addEventListener('click', closeAllPanels);
  }
  chatSend.addEventListener('click', function () {
    var text = (chatInput.value || '').trim();
    if (!text) return;
    chatLog.push({ mine: true, text: text, nickname: myNickname });
    chatInput.value = '';
    renderChat();
    if (chatWs && chatWs.readyState === 1) {
      chatWs.send(JSON.stringify({ type: 'chat', text: text }));
    }
  });
  chatInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') chatSend.click();
  });

  // 공지 목록
  NOTICES.forEach(function (n) {
    var li = document.createElement('li');
    if (n.isGuide) li.classList.add('notice-guide');
    li.innerHTML = '<strong>' + n.title + '</strong>' + n.body;
    noticeList.appendChild(li);
  });

  var currentSector = null;

  var marketZone = document.getElementById('market-zone');
  var marketResult = document.getElementById('market-result');
  var plazaZone = document.getElementById('plaza-zone');

  function renderMarket(s) {
    if (!s) return;
    var job = s.characterType || 'farmer';
    var inv = s.inventory || {};
    var invList = s.inventoryList || [];
    var guildPool = s.guildPoolList || [];
    var listings = s.merchantListingsList || [];
    var buyPrices = s.merchantBuyPrices || {};
    var profitPct = s.merchantProfitPercent || 0;

    var sellableJob = ['farmer', 'fisherman', 'miner'];
    var guildSellList = document.getElementById('guild-sell-list');
    var guildSellArea = document.getElementById('guild-sell-area');
    var guildPoolList = document.getElementById('guild-pool-list');
    var guildBuyArea = document.getElementById('guild-buy-area');
    if (guildSellArea) guildSellArea.style.display = sellableJob.indexOf(job) >= 0 ? 'block' : 'none';
    if (guildBuyArea) guildBuyArea.style.display = job === 'merchant' ? 'block' : 'none';

    if (guildSellList && sellableJob.indexOf(job) >= 0) {
      var sellItems = invList.filter(function (it) {
        var j = it.job || '';
        return j === 'farmer' || j === 'fisherman' || j === 'miner';
      });
      if (sellItems.length === 0) {
        guildSellList.innerHTML = '<p class="market-empty">판매할 아이템이 없습니다.</p>';
      } else {
        guildSellList.innerHTML = sellItems.map(function (it) {
          var c = inv[it.id] || 0;
          return '<div class="market-row"><span>' + it.name + ' x' + c + '</span><span>' + (it.gold || 0) + ' G/개</span><button type="button" class="btn-guild-sell" data-item-id="' + it.id + '" data-price="' + (it.gold || 0) + '">판매</button></div>';
        }).join('');
      }
    }
    if (guildPoolList && job === 'merchant') {
      if (guildPool.length === 0) {
        guildPoolList.innerHTML = '<p class="market-empty">상인조합에 물건이 없습니다. 농부·어부·광부가 판매하면 등장합니다.</p>';
      } else {
        guildPoolList.innerHTML = guildPool.map(function (g) {
          return '<div class="market-row"><span>' + g.itemName + ' x' + g.count + '</span><span>' + g.pricePerOne + ' G/개</span><button type="button" class="btn-guild-buy" data-item-id="' + g.itemId + '" data-price="' + g.pricePerOne + '">구매</button></div>';
        }).join('');
      }
    }

    var regList = document.getElementById('merchant-list-register');
    var regArea = document.getElementById('merchant-list-register');
    var listArea = document.getElementById('merchant-list-register');
    var merchantListArea = document.querySelector('#merchant-list-register');
    var merchantListingsEl = document.getElementById('merchant-listings-list');
    if (regList && job === 'merchant') {
      var listable = invList.filter(function (it) {
        return buyPrices[it.id] != null && (inv[it.id] || 0) > 0;
      });
      if (listable.length === 0) {
        regList.innerHTML = '<p class="market-empty">상인조합에서 구매한 아이템만 등록할 수 있습니다.</p>';
      } else {
        regList.innerHTML = listable.map(function (it) {
          var buyP = buyPrices[it.id] || 0;
          var maxP = Math.floor(buyP * (1 + profitPct / 100));
          var c = inv[it.id] || 0;
          return '<div class="market-row"><span>' + it.name + ' x' + c + '</span><span>최대 ' + maxP + ' G/개</span><input type="number" class="market-price-input" data-item-id="' + it.id + '" min="' + buyP + '" max="' + maxP + '" value="' + maxP + '" placeholder="가격"><button type="button" class="btn-merchant-list" data-item-id="' + it.id + '" data-buy-price="' + buyP + '" data-max-price="' + maxP + '">등록</button></div>';
        }).join('');
      }
    }
    if (merchantListingsEl) {
      var myId = s.characterName;
      var others = listings.filter(function (l) { return l.sellerName !== myId; });
      if (others.length === 0) {
        merchantListingsEl.innerHTML = '<p class="market-empty">등록된 물건이 없습니다.</p>';
      } else {
        merchantListingsEl.innerHTML = others.map(function (l) {
          return '<div class="market-row"><span>' + l.itemName + ' x' + l.count + '</span><span>' + l.sellerName + '</span><span>' + l.pricePerOne + ' G/개</span><button type="button" class="btn-merchant-buy" data-listing-id="' + l.listingId + '" data-price="' + l.pricePerOne + '" data-count="' + l.count + '">구매</button></div>';
        }).join('');
      }
    }
  }

  if (marketZone) {
    marketZone.addEventListener('click', function (e) {
      var tab = e.target.closest('.market-tab');
      if (tab) {
        var t = tab.getAttribute('data-tab');
        document.querySelectorAll('.market-tab').forEach(function (tb) { tb.classList.toggle('active', tb.getAttribute('data-tab') === t); });
        document.querySelectorAll('.market-section').forEach(function (sec) {
          sec.classList.toggle('active', (sec.id === 'market-general' && t === 'general') || (sec.id === 'market-guild' && t === 'guild') || (sec.id === 'market-merchant' && t === 'merchant'));
        });
        return;
      }
      var sellBtn = e.target.closest('.btn-guild-sell');
      if (sellBtn && channelState) {
        var itemId = sellBtn.getAttribute('data-item-id');
        var price = parseInt(sellBtn.getAttribute('data-price'), 10) || 0;
        api('POST', '/api/command', { action: '상인조합판매', itemId: itemId, sellCount: 1 }).then(function (res) {
          if (res.state) { channelState = res.state; updateEnergyGauge(res.state); renderMarket(res.state); }
          if (marketResult) { marketResult.textContent = res.replyText || ''; marketResult.classList.remove('hidden'); }
        });
        return;
      }
      var buyBtn = e.target.closest('.btn-guild-buy');
      if (buyBtn && channelState) {
        var itemId = buyBtn.getAttribute('data-item-id');
        api('POST', '/api/command', { action: '상인조합구매', itemId: itemId, buyCount: 1 }).then(function (res) {
          if (res.state) { channelState = res.state; updateEnergyGauge(res.state); renderMarket(res.state); }
          if (marketResult) { marketResult.textContent = res.replyText || ''; marketResult.classList.remove('hidden'); }
        });
        return;
      }
      var listBtn = e.target.closest('.btn-merchant-list');
      if (listBtn && channelState) {
        var itemId = listBtn.getAttribute('data-item-id');
        var row = listBtn.closest('.market-row');
        var priceInp = row ? row.querySelector('.market-price-input') : null;
        var price = priceInp ? parseInt(priceInp.value, 10) : parseInt(listBtn.getAttribute('data-max-price'), 10);
        api('POST', '/api/command', { action: '상인판매등록', itemId: itemId, count: 1, pricePerOne: price }).then(function (res) {
          if (res.state) { channelState = res.state; updateEnergyGauge(res.state); renderMarket(res.state); }
          if (marketResult) { marketResult.textContent = res.replyText || ''; marketResult.classList.remove('hidden'); }
        });
        return;
      }
      var mbuyBtn = e.target.closest('.btn-merchant-buy');
      if (mbuyBtn && channelState) {
        var listingId = parseInt(mbuyBtn.getAttribute('data-listing-id'), 10);
        api('POST', '/api/command', { action: '상인판매구매', listingId: listingId, buyCount: 1 }).then(function (res) {
          if (res.state) { channelState = res.state; updateEnergyGauge(res.state); renderMarket(res.state); }
          if (marketResult) { marketResult.textContent = res.replyText || ''; marketResult.classList.remove('hidden'); }
        });
        return;
      }
    });
  }

  function fetchPlazaData() {
    return api('GET', '/api/plaza/round').then(function (data) {
      return data;
    });
  }
  function renderPlazaWinnersBoard(history) {
    var el = document.getElementById('plaza-winners-list');
    if (!el) return;
    if (!history || history.length === 0 || !history[0].winners || history[0].winners.length === 0) {
      el.textContent = '당첨자 없음';
      return;
    }
    var last = history[0];
    el.innerHTML = last.winners.map(function (w) { return '<span class="plaza-winner-item">' + (w.nickname || '???') + '(' + w.payout + 'G)</span>'; }).join(' · ');
  }
  function renderPlazaHistory(history) {
    var el = document.getElementById('plaza-history');
    if (!el) return;
    if (!history || history.length === 0) {
      el.innerHTML = '<p class="plaza-empty">아직 경기 결과가 없습니다.</p>';
      return;
    }
    var labels = { '철수승': '철수 승', '영희승': '영희 승', '무승부': '무승부' };
    var html = history.slice(0, 10).map(function (r) {
      return '<div class="plaza-history-item">' + (labels[r.result] || r.result) + '</div>';
    }).join('');
    el.innerHTML = html;
  }
  function renderPlazaLiveBets(bets, totalByChoice) {
    var el = document.getElementById('plaza-live-bets');
    if (!el) return;
    if (!bets || bets.length === 0) {
      el.innerHTML = '<p class="plaza-empty">아직 배팅이 없습니다.</p>';
      return;
    }
    var icons = { '철수승': '👦', '영희승': '👧', '무승부': '🤝' };
    var labels = { '철수승': '철수 승', '영희승': '영희 승', '무승부': '무승부' };
    var html = '';
    bets.forEach(function (b) {
      html += '<div class="plaza-live-item"><span class="plaza-live-nick">' + (b.nickname || '???') + '</span> <span class="plaza-live-choice">' + (icons[b.choice] || '') + ' ' + (labels[b.choice] || b.choice) + '</span> <span class="plaza-live-amt">' + b.amount + 'G</span></div>';
    });
    if (totalByChoice) {
      html += '<div class="plaza-totals"><div>철수 승: ' + (totalByChoice['철수승'] || 0) + 'G</div><div>영희 승: ' + (totalByChoice['영희승'] || 0) + 'G</div><div>무승부: ' + (totalByChoice['무승부'] || 0) + 'G</div></div>';
    }
    el.innerHTML = html;
  }
  function updatePlazaCountdown(endTime) {
    var el = document.getElementById('plaza-countdown');
    var numEl = document.getElementById('plaza-countdown-num');
    if (!el) return;
    function tick() {
      var now = Date.now();
      var left = Math.max(0, (endTime || 0) - now);
      if (left <= 0) {
        if (numEl) { numEl.classList.add('hidden'); numEl.textContent = ''; }
        el.textContent = '결산 중...';
        el.classList.remove('hidden');
        return;
      }
      if (left <= 5000) {
        var sec = Math.ceil(left / 1000);
        if (numEl) {
          numEl.textContent = sec;
          numEl.classList.remove('hidden');
          numEl.classList.remove('plaza-countdown-pop');
          el.classList.add('hidden');
          requestAnimationFrame(function () {
            numEl.classList.add('plaza-countdown-pop');
          });
        }
      } else {
        if (numEl) { numEl.classList.add('hidden'); numEl.textContent = ''; }
        el.classList.remove('hidden');
        var m = Math.floor(left / 60000);
        var s = Math.floor((left % 60000) / 1000);
        el.textContent = '남은 시간: ' + m + '분 ' + s + '초';
      }
    }
    tick();
    var t = setInterval(tick, 1000);
    if (plazaCountdownTimer) clearInterval(plazaCountdownTimer);
    plazaCountdownTimer = t;
  }

  function showPlazaResultOverlay(result) {
    var overlay = document.getElementById('plaza-result-overlay');
    var resultText = document.getElementById('plaza-result-text');
    if (!overlay || !resultText) return;
    var labels = { '철수승': '👦 철수 승!', '영희승': '👧 영희 승!', '무승부': '🤝 무승부!' };
    resultText.textContent = labels[result] || result;
    overlay.classList.remove('hidden');
    overlay.classList.add('plaza-result-visible');
    setTimeout(function () {
      overlay.classList.remove('plaza-result-visible');
      setTimeout(function () { overlay.classList.add('hidden'); }, 500);
    }, 2500);
  }

  function showLottoResultOverlay(data, onClose) {
    var overlay = document.getElementById('lotto-result-overlay');
    var resultText = document.getElementById('lotto-result-text');
    var resultItem = document.getElementById('lotto-result-item');
    if (!overlay || !resultText || !resultItem) return;
    var result = data.result || '꽝';
    var itemId = data.itemId || null;
    var rarity = 'miss';
    if (itemId === 'energy_drink') rarity = 'common';
    else if (itemId === 'job_contract') rarity = 'rare';
    else if (itemId === 'contract_1') rarity = 'unique';
    resultText.textContent = result === '꽝' ? '꽝!' : (rarity === 'unique' ? '아싸!' : '획득!');
    resultText.className = 'lotto-result-text' + (rarity === 'unique' ? ' lotto-asai' : '');
    resultItem.textContent = result;
    resultItem.className = 'lotto-result-item lotto-rarity-' + rarity;
    var boxOpen = overlay.querySelector('.lotto-box-open');
    if (boxOpen) {
      boxOpen.classList.remove('lotto-show-sparkles');
      if (rarity === 'rare' || rarity === 'unique') boxOpen.classList.add('lotto-show-sparkles');
    }
    overlay.classList.remove('hidden');
    overlay.classList.add('lotto-result-visible');
    setTimeout(function () {
      overlay.classList.remove('lotto-result-visible');
      setTimeout(function () {
        overlay.classList.add('hidden');
        if (typeof onClose === 'function') onClose();
      }, 400);
    }, 2600);
  }
  var plazaCountdownTimer = null;
  var selectedPlazaChoice = null;

  function openPlaza() {
    sectorPlaceholder.classList.add('hidden');
    if (plazaZone) plazaZone.classList.remove('hidden');
    fetchPlazaData().then(function (data) {
      if (data.currentRound) {
        renderPlazaLiveBets(data.currentRound.bets, data.currentRound.totalByChoice);
        updatePlazaCountdown(data.currentRound.endTime);
      } else {
        renderPlazaLiveBets([], null);
        document.getElementById('plaza-countdown').textContent = '대기 중...';
      }
      renderPlazaHistory(data.history || []);
      renderPlazaWinnersBoard(data.history || []);
      if (channelState) updateEnergyGauge(channelState);
    });
  }

  var panelPlazaHistory = document.getElementById('panel-plaza-history');
  var panelPlazaLive = document.getElementById('panel-plaza-live');
  var btnPlazaHistory = document.getElementById('btn-plaza-history');
  var btnPlazaLive = document.getElementById('btn-plaza-live');
  if (btnPlazaHistory) btnPlazaHistory.addEventListener('click', function () { if (panelPlazaHistory) openPanel(panelPlazaHistory); });
  if (btnPlazaLive) btnPlazaLive.addEventListener('click', function () { if (panelPlazaLive) openPanel(panelPlazaLive); });

  function openSector(sector, name) {
    currentSector = sector;
    sectorPlaceholder.textContent = name + '에 입장했습니다.';
    activityResult.classList.add('hidden');
    if (marketZone) marketZone.classList.add('hidden');
    if (marketResult) marketResult.classList.add('hidden');
    if (plazaZone) plazaZone.classList.add('hidden');
    if (sector === 'farm') {
      var act = ACTIVITY_BY_JOB[myChannel] || ACTIVITY_BY_JOB.farmer;
      activityZone.classList.remove('hidden');
      activityAnim.textContent = act.emoji;
      activityAnim.className = 'activity-anim ' + act.animClass;
      btnActivity.textContent = act.label;
      btnActivity.disabled = !channelState || (channelState.energy != null && channelState.energy < 2);
    } else if (sector === 'market') {
      activityZone.classList.add('hidden');
      if (marketZone) marketZone.classList.remove('hidden');
      api('GET', '/api/state').then(function (data) {
        if (data && data.state) {
          channelState = data.state;
          updateEnergyGauge(channelState);
          var lottoRem = document.getElementById('lotto-remaining');
          var narakRem = document.getElementById('narak-remaining');
          if (lottoRem) lottoRem.textContent = '(오늘 ' + (data.state.lottoBoxRemaining != null ? data.state.lottoBoxRemaining : 5) + '/5 남음)';
          if (narakRem) narakRem.textContent = '(오늘 ' + (data.state.narakBoxRemaining ? '1' : '0') + '/1 남음)';
          renderMarket(channelState);
        }
      });
    } else if (sector === 'plaza') {
      activityZone.classList.add('hidden');
      sectorPlaceholder.classList.add('hidden');
      openPlaza();
    } else {
      activityZone.classList.add('hidden');
      sectorPlaceholder.textContent = name + '에 입장했습니다. (이후 콘텐츠 구현)';
    }
    channelMap.classList.add('hidden');
    sectorView.classList.remove('hidden');
  }

  document.querySelectorAll('.sector-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var sector = btn.getAttribute('data-sector');
      var name = getSectorName(myChannel, sector);
      openSector(sector, name);
    });
  });
  btnBackMap.addEventListener('click', function () {
    sectorView.classList.add('hidden');
    channelMap.classList.remove('hidden');
    currentSector = null;
  });

  document.addEventListener('click', function (e) {
    if (e.target.closest('.plaza-choice-btn')) {
      var btn = e.target.closest('.plaza-choice-btn');
      selectedPlazaChoice = btn ? btn.getAttribute('data-choice') : null;
      document.querySelectorAll('.plaza-choice-btn').forEach(function (b) { b.classList.remove('selected'); });
      if (btn) btn.classList.add('selected');
    }
    if (e.target.closest('#plaza-bet-btn') || e.target.closest('.btn-plaza-bet')) {
      if (!selectedPlazaChoice) {
        var resEl = document.getElementById('plaza-bet-result');
        if (resEl) { resEl.textContent = '철수 승, 영희 승, 무승부 중 선택하세요.'; resEl.classList.remove('hidden'); }
        return;
      }
      var amtEl = document.getElementById('plaza-bet-amount');
      var amt = Math.min(100, Math.max(30, parseInt(amtEl ? amtEl.value : 30, 10) || 30));
      api('POST', '/api/command', { action: '광장배팅', choice: selectedPlazaChoice, amount: amt })
        .then(function (res) {
          if (res.state) { channelState = res.state; updateEnergyGauge(res.state); }
          var resEl = document.getElementById('plaza-bet-result');
          if (resEl) {
            resEl.textContent = res.replyText || (res.plazaBet ? selectedPlazaChoice + ' ' + amt + 'G 배팅 완료!' : '');
            resEl.classList.remove('hidden');
          }
          if (res.plazaBet) fetchPlazaData().then(function (d) {
            if (d.currentRound) {
              renderPlazaLiveBets(d.currentRound.bets, d.currentRound.totalByChoice);
              updatePlazaCountdown(d.currentRound.endTime);
            }
          });
        });
    }
  });

  document.querySelectorAll('.btn-market').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var boxId = btn.getAttribute('data-box');
      var count = parseInt(btn.getAttribute('data-count'), 10);
      var action = boxId ? (boxId === 'lotto_box' ? '로또상자구매' : '나락상자구매') : '계약서구매';
      var body = boxId ? { action: action } : { action: '계약서구매', buyCount: count || 1 };
      api('POST', '/api/command', body)
        .then(function (res) {
          if (res.state) {
            channelState = res.state;
            updateEnergyGauge(res.state);
            var lottoRem = document.getElementById('lotto-remaining');
            var narakRem = document.getElementById('narak-remaining');
            if (lottoRem && res.state.lottoBoxRemaining != null) lottoRem.textContent = '(오늘 ' + res.state.lottoBoxRemaining + '/5 남음)';
            if (narakRem && res.state.narakBoxRemaining != null) narakRem.textContent = '(오늘 ' + res.state.narakBoxRemaining + '/1 남음)';
          }
          if (marketResult) {
            marketResult.textContent = res.replyText || (res.buyContract ? res.buyContract.name + ' ' + res.buyContract.count + '장 구매!' : '') || (res.buyBox ? res.buyBox.name + ' 구매!' : '');
            marketResult.classList.remove('hidden');
          }
          if (res.state && currentSector === 'market') renderMarket(res.state);
        });
    });
  });

  if (marketZone) {
    marketZone.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var itemId = btn.getAttribute('data-item-id');
      var count = parseInt(btn.getAttribute('data-count') || btn.getAttribute('data-buy-count') || '1', 10);
      var price = parseInt(btn.getAttribute('data-price') || '0', 10);
      var listingId = btn.getAttribute('data-listing-id');
      var marketResult = document.getElementById('market-result');
      function showRes(msg) {
        if (marketResult) { marketResult.textContent = msg; marketResult.classList.remove('hidden'); }
      }
      function refresh() {
        api('GET', '/api/state').then(function (d) {
          if (d && d.state) {
            channelState = d.state;
            updateEnergyGauge(d.state);
            renderMarket(d.state);
          }
        });
      }
      if (action === '상인조합판매' && itemId) {
        api('POST', '/api/command', { action: '상인조합판매', itemId: itemId, sellCount: count }).then(function (res) {
          showRes(res.replyText || '');
          if (res.state) { channelState = res.state; refresh(); }
        });
      } else if (action === '상인조합구매' && itemId) {
        api('POST', '/api/command', { action: '상인조합구매', itemId: itemId, buyCount: count }).then(function (res) {
          showRes(res.replyText || '');
          if (res.state) { channelState = res.state; refresh(); }
        });
      } else if (action === '상인판매등록' && itemId) {
        api('POST', '/api/command', { action: '상인판매등록', itemId: itemId, listCount: count, pricePerOne: price }).then(function (res) {
          showRes(res.replyText || '');
          if (res.state) { channelState = res.state; refresh(); }
        });
      } else if (action === '상인판매구매' && listingId) {
        api('POST', '/api/command', { action: '상인판매구매', listingId: listingId, buyCount: count }).then(function (res) {
          showRes(res.replyText || '');
          if (res.state) { channelState = res.state; refresh(); }
        });
      }
    });
  }

  btnActivity.addEventListener('click', function () {
    if (!currentSector || currentSector !== 'farm') return;
    var act = ACTIVITY_BY_JOB[myChannel] || ACTIVITY_BY_JOB.farmer;
    if (!act) return;
    btnActivity.disabled = true;
    btnActivity.textContent = act.busy || '진행 중...';
    activityResult.classList.add('hidden');
    activityAnim.classList.add(act.animClass);
    var duration = act.duration || 5000;
    setTimeout(function () {
      activityAnim.classList.remove(act.animClass);
      api('POST', '/api/command', { text: act.cmd, action: act.cmd })
        .then(function (res) {
          if (res.state) {
            channelState = res.state;
            updateEnergyGauge(res.state);
          }
          btnActivity.textContent = act.label;
          btnActivity.disabled = !res.state || (res.state.energy != null && res.state.energy < 2);
          if (res.replyText && !res.activityItem && res.activityGold == null) {
            activityResult.textContent = res.replyText;
            activityResult.className = 'activity-result';
            activityResult.classList.remove('hidden');
            return;
          }
          if (res.activityItem) {
            var rarity = res.activityItem.rarity || 'normal';
            var prefix = '';
            if (rarity === 'rare') prefix = '<span class="result-prefix rare-prefix">✨ 레어! </span>';
            else if (rarity === 'unique') prefix = '<span class="result-prefix unique-prefix">🎊 아싸! 유니크! </span>';
            var count = res.activityItem.count || 1;
            var doubled = res.activityItem.doubled || count >= 2;
            var parts = [prefix + '<span class="result-item">' + res.activityItem.name + '</span> ' + (doubled ? 'x2 <span class="result-doubled">더블!</span> ' : '') + '획득!'];
            if (res.activityItem.gold > 0) parts.push(' <span class="result-gold">(' + (res.activityItem.gold * count) + ' G)</span>');
            if (res.activityContract) parts.push(' <span class="result-contract">+ ' + res.activityContract.name + '</span>');
            if (res.activityNewTitle) parts.push(' <span class="result-title">🎉 ' + res.activityNewTitle + ' 칭호 획득!</span>');
            activityResult.innerHTML = parts.join('');
            activityResult.className = 'activity-result' + (rarity === 'rare' ? ' rarity-rare' : rarity === 'unique' ? ' rarity-unique' : '');
            activityResult.classList.remove('hidden');
          }
          if (res.activityGold != null) {
            var merRarity = res.activityRarity || 'normal';
            var merPrefix = '';
            if (merRarity === 'rare') merPrefix = '<span class="result-prefix rare-prefix">✨ 고급판매! </span>';
            else if (merRarity === 'unique') merPrefix = '<span class="result-prefix unique-prefix">🎊 아싸! 땡잡았다! </span>';
            activityResult.innerHTML = merPrefix + '<span class="result-gold">+' + res.activityGold + ' G</span> 획득!';
            activityResult.className = 'activity-result' + (merRarity === 'rare' ? ' rarity-rare' : merRarity === 'unique' ? ' rarity-unique' : '');
            activityResult.classList.remove('hidden');
          }
        })
        .catch(function () {
          btnActivity.textContent = act.label;
          btnActivity.disabled = false;
          activityResult.textContent = '연결에 실패했습니다.';
          activityResult.classList.remove('hidden');
        });
    }, duration);
  });

  // 세션 복원: 이미 캐릭터 있으면 채널 화면으로
  api('GET', '/api/state').then(function (data) {
    if (data && data.state && data.state.characterName) {
      channelState = data.state;
      var job = data.state.characterType || 'farmer';
      showChannelScreen(job, data.state.characterName);
      updateEnergyGauge(channelState);
    }
  });
})();
