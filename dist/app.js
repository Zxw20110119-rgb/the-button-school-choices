(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const SESSION_SIZE=10;
  const state={questions:[],index:0,answers:[],client:null,live:false,userId:'',busy:false};
  const screens={landing:$('#landing'),game:$('#game'),summary:$('#summary')};
  const ids=['category','counter','gameProgress','benefitText','consequenceText','choices','resultPanel','resultKicker','resultTitle','totalVotes','pressPercent','walkPercent','pressBar','walkBar','positionText','scoreText','neutralNote','errorCard','modePill','modeText','dilemmaCard','nextLabel','errorText','retryButton'].reduce((o,k)=>(o[k]=$(`#${k}`),o),{});

  function anonymousId(){let id=localStorage.getItem('the_button_anonymous_id');if(!id){id=`anon_${crypto.randomUUID()}`;localStorage.setItem('the_button_anonymous_id',id)}return id}
  function show(name) {
    Object.values(screens).forEach(screen => screen.classList.remove('is-active'));
    screens[name].classList.add('is-active');
    window.scrollTo(0, 0);
    screens[name].querySelector('h1, h2')?.focus({preventScroll: true});
  }
  function shuffled(input){const a=[...input];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function variedSelection(bank){const groups={};shuffled(bank.filter(q=>q.active!==false)).forEach(q=>(groups[q.category]??=[]).push(q));const categories=shuffled(Object.keys(groups));const pick=[];while(pick.length<SESSION_SIZE&&categories.some(c=>groups[c].length)){for(const c of categories){if(groups[c].length&&pick.length<SESSION_SIZE)pick.push(groups[c].pop())}}return shuffled(pick)}
  function controversy(p){return Math.max(0,Math.round(100-2*Math.abs(p-50)))}
  function controversyLabel(score) {
    if (score >= 90) return 'Extremely divisive';
    if (score >= 80) return 'Highly divisive';
    if (score >= 70) return 'Divisive';
    if (score >= 50) return 'One-sided';
    return 'Very one-sided';
  }
  function demoResult(q,choice){const existing=JSON.parse(localStorage.getItem('the_button_demo_votes')||'{}');if(existing[q.id])return existing[q.id];const base=44+((q.id*17)%13);const total=280+((q.id*137)%2100);let press=Math.round(total*base/100);let walk=total-press;if(choice==='PRESS')press++;else walk++;const result={press_votes:press,walk_votes:walk,total_votes:press+walk,previous_choice:null,test_data:true};existing[q.id]=result;localStorage.setItem('the_button_demo_votes',JSON.stringify(existing));return result}

  async function initData() {
    state.userId = anonymousId();
    state.live = false;
    const cfg = window.BUTTON_CONFIG || {};
    if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
      try {
        state.client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        const {data, error} = await state.client.rpc('get_game_questions', {question_count: SESSION_SIZE});
        if (error || !data?.length) throw error || new Error('No questions');
        state.questions = data;
        state.live = true;
      } catch (e) {
        console.error('Supabase unavailable, using demo mode', e);
      }
    }
    if (!state.live) state.questions = variedSelection(window.QUESTION_BANK);
    ids.modePill.classList.toggle('is-live', state.live);
    ids.modeText.textContent = state.live ? 'Live · shared votes' : 'Demo · sample votes';
  }

  async function start() {
    if (state.busy) return;
    state.busy = true;
    ids.errorCard.classList.remove('is-visible');
    try {
      await initData();
      if (!state.questions.length) throw new Error('No questions');
      state.index = 0;
      state.answers = [];
      $('#copyStatus').textContent = '';
      renderQuestion();
      show('game');
    } catch (e) {
      console.error(e);
      ids.dilemmaCard.hidden = true;
      ids.choices.hidden = true;
      ids.resultPanel.classList.remove('is-visible');
      show('game');
      showError('We couldn’t load the questions.', start);
    } finally {
      state.busy = false;
    }
  }

  function renderQuestion() {
    const q = state.questions[state.index];
    const number = state.index + 1;
    const count = state.questions.length;
    ids.category.textContent = q.category;
    ids.counter.textContent = `Question ${number} of ${count}`;
    ids.gameProgress.max = count;
    ids.gameProgress.value = number;
    ids.benefitText.textContent = q.benefit_text;
    ids.consequenceText.textContent = q.consequence_text;
    ids.nextLabel.textContent = number === count ? 'See your round' : 'Next question';
    ids.resultPanel.classList.remove('is-visible');
    ids.dilemmaCard.hidden = false;
    ids.choices.hidden = false;
    $$('[data-choice]').forEach(button => {
      button.disabled = false;
      button.classList.remove('is-pressed');
    });
    ids.errorCard.classList.remove('is-visible');
  }

  function showError(message, retry) {
    ids.errorText.textContent = message;
    ids.retryButton.onclick = retry;
    ids.errorCard.classList.add('is-visible');
    if (screens.game.classList.contains('is-active')) ids.retryButton.focus();
  }

  async function castVote(choice, button) {
    if (state.busy) return;
    state.busy = true;
    button.classList.add('is-pressed');
    $$('[data-choice]').forEach(control => { control.disabled = true; });
    ids.errorCard.classList.remove('is-visible');
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      await new Promise(resolve => setTimeout(resolve, 160));
    }
    const q = state.questions[state.index];
    try {
      let result;
      if (state.live) {
        const {data, error} = await state.client.rpc('submit_vote', {
          p_anonymous_user_id: state.userId, p_question_id: q.id, p_choice: choice
        });
        if (error) throw error;
        result = Array.isArray(data) ? data[0] : data;
      } else {
        result = demoResult(q, choice);
      }
      reveal(q, choice, result);
    } catch (e) {
      console.error('Vote submission failed', e);
      button.classList.remove('is-pressed');
      $$('[data-choice]').forEach(control => { control.disabled = false; });
      showError('We couldn’t save your choice.', () => castVote(choice, button));
    } finally {
      state.busy = false;
    }
  }

  function reveal(q, attemptedChoice, result) {
    const choice = result.previous_choice || attemptedChoice;
    const total = Number(result.total_votes) || 0;
    const pressVotes = Number(result.press_votes) || 0;
    const press = total ? Math.round(pressVotes / total * 100) : 50;
    const walk = 100 - press;
    const score = controversy(press);
    const pressed = choice === 'PRESS';
    const chosenPct = pressed ? press : walk;
    state.answers.push({q, choice, press, walk, score, agreement: chosenPct, isMinority: chosenPct < 50});
    ids.resultKicker.hidden = !result.previous_choice;
    ids.resultTitle.textContent = pressed ? 'You pressed the button.' : 'You walked away.';
    const votesLabel = state.live ? (total === 1 ? 'vote' : 'votes') : 'sample votes';
    ids.totalVotes.textContent = `${total.toLocaleString()} ${votesLabel}`;
    ids.positionText.textContent = press === walk ? 'Even split' : chosenPct > 50 ? 'In the majority' : 'In the minority';
    ids.scoreText.textContent = `${score}/100 · ${controversyLabel(score)}`;
    ids.neutralNote.textContent = score >= 80 ? 'The two choices got a similar share of votes.' : '';
    ids.neutralNote.hidden = !ids.neutralNote.textContent;
    ids.pressPercent.textContent = `${press}%`;
    ids.walkPercent.textContent = `${walk}%`;
    ids.pressBar.style.width = `${press}%`;
    ids.walkBar.style.width = `${walk}%`;
    ids.choices.hidden = true;
    ids.resultPanel.classList.add('is-visible');
    if (screens.game.classList.contains('is-active')) ids.resultTitle.focus();
  }

  function next() {
    if (!ids.resultPanel.classList.contains('is-visible')) return;
    if (state.index + 1 === state.questions.length) {
      finish();
      return;
    }
    state.index++;
    renderQuestion();
    window.scrollTo(0, 0);
    ids.benefitText.focus({preventScroll: true});
  }

  function finish() {
    const answers = state.answers;
    const pressed = answers.filter(answer => answer.choice === 'PRESS').length;
    const minority = answers.filter(answer => answer.isMinority).length;
    const mostDivisive = [...answers].sort((a, b) => b.score - a.score)[0];
    const average = Math.round(answers.reduce((sum, answer) => sum + answer.agreement, 0) / (answers.length || 1));
    $('#pressedStat').innerHTML = `${pressed}<span>/${answers.length}</span>`;
    $('#minorityStat').textContent = minority;
    $('#topicStat').textContent = mostDivisive?.q.category || '—';
    $('#agreementStat').textContent = `${average}%`;
    const counts = {};
    answers.forEach(({q, choice}) => {
      const value = choice === 'PRESS' ? q.press_value : q.walk_value;
      counts[value] = (counts[value] || 0) + 1;
    });
    const leading = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 2);
    const values = leading.map(value => value.toLowerCase()).join(' and ');
    const reflection = values ? `This round, you most often chose ${values}. ` : '';
    $('#profileText').textContent = (reflection + (state.live ? '' : 'This demo uses sample votes.')).trim();
    renderProfile(counts);
    show('summary');
  }
  function renderProfile(counts){const axes=[['Freedom','Security'],['Privacy','Convenience'],['Control','Automation'],['Equality','Reward'],['Caution','Progress']];$('#profileBars').innerHTML=axes.map(([l,r])=>{const lv=counts[l]||0,rv=counts[r]||0,pos=lv+rv?Math.round(rv/(lv+rv)*100):50;return`<div class="profile-axis"><div class="axis-labels"><span>${l}</span><span>${r}</span></div><div class="axis-track"><span style="left:${pos}%"></span></div></div>`}).join('')}

  async function copyResults() {
    const pressed = state.answers.filter(answer => answer.choice === 'PRESS').length;
    const minority = state.answers.filter(answer => answer.isMinority).length;
    const topic = [...state.answers].sort((a, b) => b.score - a.score)[0]?.q.category || '—';
    const label = state.live ? 'The Button' : 'The Button (demo with sample votes)';
    const text = `${label}: I pressed ${pressed}/${state.answers.length} times. Minority choices: ${minority}. Most divisive topic: ${topic}.`;
    try {
      await navigator.clipboard.writeText(text);
      $('#copyStatus').textContent = 'Results copied.';
    } catch {
      $('#copyStatus').textContent = text;
    }
  }

  document.addEventListener('click', event => {
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      castVote(choice.dataset.choice, choice);
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'start' || action === 'restart') start();
    if (action === 'next') next();
    if (action === 'home' && !screens.landing.classList.contains('is-active')) show('landing');
    if (action === 'copy') copyResults();
    if (action === 'privacy') $('#privacyDialog').showModal();
    if (action === 'close-dialog') $('#privacyDialog').close();
  });

  addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat ||
        !screens.game.contains(document.activeElement) || ids.choices.hidden ||
        !screens.game.classList.contains('is-active')) return;
    if (event.key.toLowerCase() === 'p') $('[data-choice="PRESS"]').click();
    if (event.key.toLowerCase() === 'w') $('[data-choice="WALK_AWAY"]').click();
  });
  if('serviceWorker'in navigator)addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error));
})();
