window.addEventListener("DOMContentLoaded", () => {

    const btns = document.querySelectorAll(".btn");
    const langBtn = document.querySelector(".lang_btn");
    const renewBtn = document.querySelector(".rate_btn");
    const currentRateField = document.querySelector(".rate_current");
    const prevRateField = document.querySelector(".rate_old");
    const differenceRateField = document.querySelector(".rate_difference");
    const popup = document.querySelector(".popup");

    let id = null;
    let module = null;
    let dealRate = null;
    let nbuRate = null;
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

        ZOHO.CRM.API.getRecord({ Entity: module, RecordID: id })
            .then((data) => { 
                dealRate = +(data.data[0].Exchange_rates);
            })
            .then(() => getNbuRate())
            .then(() => setNbuRate())
            .then(() => setDealRate())
            .then(() => setRateDifference())
            .then(() => showBtn());

    });

    ZOHO.embeddedApp.init();

    renewBtn.addEventListener("click", () => {
        ZOHO.CRM.API.updateRecord({
            Entity: module,
            APIData: {
                id,
                Exchange_rates: +(nbuRate.toFixed(2))  
            }, 
            Trigger: ["workflow"]
        }).then((data) => {
            if (data.data[0].code === "SUCCESS") {
                differenceRates = 0;
                prevRateField.children[1].innerHTML = `${nbuRate.toFixed(2)}&#8372;`;
                differenceRateField.children[1].textContent = `${differenceRates.toFixed(1)}%`;
                showPopup(langObj?.successUpdateMessage || langObjError.success);
            } else {
                showPopup(langObj?.unsuccessUpdateMessage || langObjError.error);
                console.log(langObj?.unsuccessUpdateMessage || langObjError.error);
            }
        }).catch((e) => {
            showPopup(langObj?.unsuccessUpdateMessage || langObjError.error);
            console.log(`${langObj?.unsuccessUpdateMessage || langObjError.error}: ${e}`);
        });
    }) 

    langBtn.addEventListener("click", () => {
        if (!langObj) {
            showPopup("Error getting language settings object");
            return;
        };
        langBtn.textContent === "EN" ? langBtn.textContent = "UA" : langBtn.textContent = "EN";
        getLangObj().then(() => {
            currentRateField.children[0].textContent = langObj.nbuLabel;
            prevRateField.children[0].textContent = langObj.dealLabel;
            differenceRateField.children[0].textContent = langObj.differenceLabel;
            renewBtn.textContent = langObj.renewBtnLabel;
        })
    })


    async function getLangObj() {
        await fetch("translations/en.jso")
            .then((res) => res.json())
            .then(obj => langBtn.textContent === "EN" ? langObj = obj.ua : langObj = obj.en)
            .catch((e) => {
                showPopup("Error getting language settings object");
                console.log(`Error getting language settings object: ${e}`);
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
    
    function setDealRate() {
        if (dealRate) {
            prevRateField.children[1].innerHTML = `${dealRate.toFixed(2)}&#8372;`;
        };
    }

    function setRateDifference() {
        if (dealRate && typeof nbuRate === "number") {
            differenceRates = (dealRate / nbuRate - 1) * 100;
            differenceRateField.children[1].textContent = `${differenceRates.toFixed(1)}%`;
        };
    }

    async function getNbuRate() {
        try {
            const responseToNBU = await fetch('https://bank.gov.u/NBUStatService/v1/statdirectory/dollar_info?json');
            const parsed = await responseToNBU.json();
            nbuRate = +(parsed[0].rate);
        } catch (e) {
            nbuRate = `${langObj?.fetchNbuErrorView || langObjError.unk}`;
            console.log(`Error retrieving bank data: ${e}`);
        }
    }

    function setNbuRate() {
        if (typeof nbuRate === "number") {
            currentRateField.children[1].innerHTML = `${nbuRate.toFixed(2)}&#8372;`;
        } else {
            currentRateField.children[1].textContent = `${langObj?.fetchNbuErrorView || langObjError.unk}`;
        };
    }

    function showBtn() {
        if (differenceRates >= 5) {
            renewBtn.style.visibility = "visible";
            renewBtn.disabled = false;
        } else { 
            renewBtn.style.visibility = "hidden";
            renewBtn.disabled = true;
        }
    }
})  



   