window.addEventListener("DOMContentLoaded", () => {

    const rateTitle = document.querySelector(".rate_title");
    const historyTitle = document.querySelector(".history_title");
    const historyTopic = document.querySelector(".history_topic");
    const historyList = document.querySelector(".history_items");
    const btns = document.querySelectorAll(".btn");
    const langBtn = document.querySelector(".btn_lang");
    const renewBtn = document.querySelector(".btn_rate");
    const beginBtn = document.querySelector(".btn_begin");
    const prevBtn = document.querySelector(".btn_prev");
    const nbuRateField = document.querySelector(".rate_nbu");
    const dealRateField = document.querySelector(".rate_deal");
    const differenceRateField = document.querySelector(".rate_difference");
    const popup = document.querySelector(".popup");

    let id = null;
    let module = null;
    let dealRate = null;
    let nbuRate = null;
    let historyArray = [];
    let historyOffset = 0;
    let historyLength = 0;
    let differenceRates = 0;
    let langObj;

    let langObjError = {
        success: "Success",
        error: "Error",
        unk: "Unknown"
    }
    
    getLangObj();

    ZOHO.embeddedApp.on("PageLoad", (data) => {
        id = data.EntityId;
        module = data.Entity;

        ZOHO.CRM.UI.Resize({height: "342"});

        ZOHO.CRM.API.getRecord({ Entity: module, RecordID: id })
            .then((data) => { 
                dealRate = +(data.data[0].Exchange_rates);
            })
            .then(() => getNbuRate())
            .then(() => setNbuRate())
            .then(() => setDealRate(dealRate))
            .then(() => setRateDifference())
            .then(() => showRenewBtn())
            .then(() => setHistoryList());
    });

    ZOHO.embeddedApp.init();

    renewBtn.addEventListener("click", () => {
        renewBtn.disabled = true;
        ZOHO.CRM.API.updateRecord({
            Entity: module,
            APIData: {
                id,
                Exchange_rates: +(nbuRate.toFixed(2))  
            }, 
            Trigger: ["workflow"]
        }).then((data) => {
            if (data.data[0].code === "SUCCESS") {
                dealRate = nbuRate;
                setDealRate(nbuRate);
                const prevDifference = differenceRates;
                differenceRates = 0;
                setDealRate(nbuRate);
                setRateDifference();
                showPopup(langObj?.successUpdateMessage || langObjError.success);
                saveRateHistory(prevDifference);
            } else {
                showPopup(langObj?.unsuccessUpdateMessage || langObjError.error);
                console.error(langObj?.unsuccessUpdateMessage || langObjError.error);
            }
        }).catch((e) => {
            showPopup(langObj?.unsuccessUpdateMessage || langObjError.error);
            console.error(`${langObj?.unsuccessUpdateMessage || langObjError.error}`, e);
        }).finally(() => showRenewBtn());
    }) 

    langBtn.addEventListener("click", () => {
        if (!langObj) {
            showPopup("Error getting language settings object");
            return;
        };
        langBtn.textContent === "EN" ? langBtn.textContent = "UA" : langBtn.textContent = "EN";
        getLangObj().then(() => {
            nbuRateField.children[0].textContent = langObj.nbuLabel;
            if (typeof nbuRate === "string") {
                nbuRateField.children[1].textContent = `${langObj?.fetchNbuErrorView || langObjError.unk}`;
            }
            dealRateField.children[0].textContent = langObj.dealLabel;
            differenceRateField.children[0].textContent = langObj.differenceLabel;
            renewBtn.textContent = langObj.renewBtnLabel;
            renewBtn.setAttribute('title', langObj.renewBtnTitle);
            rateTitle.textContent = langObj.rateTitle;
            historyTitle.textContent = langObj.historyTitle;
            historyTopic.children[0].textContent = langObj.historyLabelDate;
            historyTopic.children[1].textContent = langObj.historyLabelRate;
            historyTopic.children[2].textContent = langObj.historyLabelDifference;
            prevBtn.textContent = langObj.prevBtnLabel;
            beginBtn.textContent = langObj.beginBtnLabel;
        })
    })

    beginBtn.addEventListener("click", () => {
        historyOffset = 0;
        setHistoryList();
    })

    prevBtn.addEventListener("click", () => {
        setHistoryList();
    })

    async function setHistoryList() {
        await getRateHistory()
            .then(() => renderHistoryList());
    }

    async function getRateHistory() {
        const response = await ZOHO.CRM.API.searchRecord({
            Entity:"Exchange_Rate_History",
            Type:"criteria",
            Query:`(Deal:equals:${id})`
        });
      
        const history  = response.data;

        if (!Array.isArray(history)) {
            console.error(`${langObj?.hystoryGetError || langObjError.error}`, response);
            return;
        }

        historyArray = history.slice(historyOffset, historyOffset + 5);
        historyLength = history.length;
        historyOffset += historyArray.length;
    }
    
    function renderHistoryList() {
        historyList.innerHTML = "";

        if (!historyArray.length) {
            beginBtn.style.display = "none";
            prevBtn.style.display = "none";
            const element = document.createElement("div"); 
            element.innerHTML = ` 
                <h2 class="title" style="margin: 32px auto;">${langObj?.historyEmpty || langObjError.unk}</h2>
            `;
            historyList.append(element); 
        } 

        if (historyLength > 5) {
            beginBtn.style.display = "block";
            prevBtn.style.display = "block";
            prevBtn.disabled = false;
        } else {
            beginBtn.style.display = "none";
            prevBtn.style.display = "none";
            beginBtn.disabled = true;
            prevBtn.disabled = true;
        }

        if (historyOffset > 5) {
            beginBtn.disabled = false;
        } else {
            beginBtn.disabled = true;
        }

        if (historyOffset >= historyLength) {
            prevBtn.disabled = true;
        } else {
            prevBtn.disabled = false;
        }

        historyArray.map(card => {
            const element = document.createElement("div"); 
            element.innerHTML = ` 
                <div class="history_item">
                    <div class="history_cell">${dateNormalizeFromZoho(new Date(card.Date))}</div>
                    <div class="history_cell">${card.Rate}&#8372;</div>
                    <div class="history_cell">${card.Difference.toFixed(1)}%</div>
                </div>
                <div class="divider" style="margin-top: 8px;"></div>
            `;
            historyList.append(element); 
        })
    }

    async function saveRateHistory(prevDifference) {
        const event = {
            Name: `${Date.now()}_${id}`,
            Deal: id,
            Rate: +(nbuRate.toFixed(2)),
            Date: dateNormalizeForZoho(new Date()),
            Rate_Source: "НБУ",
            Difference: prevDifference
        }
        const response = await ZOHO.CRM.API.insertRecord({
            Entity: "Exchange_Rate_History",
            APIData: event
        });
      
        const result = response.data?.[0];
        if (result.code === "SUCCESS") {
            historyOffset = 0;
            await setHistoryList();
            historyArray.unshift(event);
            if (historyArray.length > 5) historyArray.length = 5;
            renderHistoryList();
            console.log(`${langObj?.hystoryAddSuccess || langObjError.success} ${result.details.id}`);
        } else {
            console.error(`${langObj?.hystoryAddError || langObjError.error} ${result.message}`);
        }
    }

    async function getLangObj() {
        await fetch("translations/en.json")
            .then((res) => res.json())
            .then(obj => langBtn.textContent === "EN" ? langObj = obj.ua : langObj = obj.en)
            .catch((err) => {
                showPopup("Error getting language settings object");
                console.error(`Error getting language settings object: `, err);
            });
    }

    function showPopup(text) {
        popup.style.display = "block";
        popup.textContent = `${text}`;
        btns.forEach(btn => btn.disabled = true);
        let timeout = setTimeout(() => {
            popup.style.display = "none";
            btns.forEach(btn => btn.disabled = false);
        }, 3000);

        return () => clearTimeout(timeout);
    }
    
    function setDealRate(rate) {
        if (rate) {
            dealRateField.children[1].innerHTML = `${rate.toFixed(2)}&#8372;`;
        };
    }

    function setRateDifference() {
        if (dealRate && typeof nbuRate === "number") {
            differenceRates = +(((dealRate / nbuRate - 1) * 100).toFixed(2));
            if (+(differenceRates.toFixed(1)) !== 0) {
                differenceRateField.children[1].textContent = `${differenceRates.toFixed(1)}%`;
            } else {
                differenceRateField.children[1].textContent = "0.0%";
            }
        };
    }

    async function getNbuRate() {
        try {
            const requestToNbu = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/dollar_info?json');
            const parsed = await requestToNbu.json();
            nbuRate = +(parsed[0].rate);
            const dataToLS = `${parsed[0].rate}, ${new Date()}`;
            localStorage.setItem("excangeRate", dataToLS);
        } catch (e) {
            const dataFromLS = localStorage.getItem("excangeRate");
            if (dataFromLS) {
                const date = dateNormalize(dataFromLS.split(", ")[1]);
                nbuRate = +(dataFromLS.split(", ")[0]);
                showPopup(`${langObj?.fetchNbuErrorMessage || langObjError.error} ${date}`);
            } else {
                nbuRate = `${langObjError.unk}`;
                showPopup(`${langObj?.fetchNbuErrorMessage || langObjError.error} no date`);
            }
            console.error(`Error retrieving bank data: ${e}`);
        }
    }

    function setNbuRate() {
        if (typeof nbuRate === "number") {
            nbuRateField.children[1].innerHTML = `${nbuRate.toFixed(2)}&#8372;`;
        } else {
            nbuRateField.children[1].textContent = `${langObj?.fetchNbuErrorView || langObjError.unk}`;
        };
    }

    function showRenewBtn() {
        if (differenceRates >= 5) {
            renewBtn.style.display = "block";
            renewBtn.disabled = false;
        } else { 
            renewBtn.style.display = "none";
            renewBtn.disabled = true;
        }
    }
})  


function dateNormalize(str) {
    const date = new Date(str)
    const pad = (n) => String(n).padStart(2, "0");
  
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); 
    const year = date.getFullYear();
  
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
  
    return `${day}.${month}.${year} ${hours}:${minutes}`;
} 

function dateNormalizeFromZoho(str) {
    const time = new Date(str);
    const offset = -time.getTimezoneOffset();
    const date = new Date(Date.parse(time) + offset * 60000)
    const pad = (n) => String(n).padStart(2, "0");
  
    const day = pad(date.getDate());
    const month = pad(date.getMonth() + 1); 
    const year = date.getFullYear();
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${day}.${month}.${year} ${hours}:${minutes}`;
} 

function dateNormalizeForZoho(date) {
    const offset = -date.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const pad = (n) => String(Math.floor(Math.abs(n))).padStart(2, '0');
    const hours = pad(offset / 60);
    const minutes = pad(offset % 60);
  
    return date.toISOString().slice(0, 19) + sign + hours + ":" + minutes;
}







   