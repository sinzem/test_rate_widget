window.addEventListener("DOMContentLoaded", () => {

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
                popup.style.display = "block";
                popup.innerHTML = `Оновлення успiшне`;
                differenceRates = 0;
                prevRateField.children[1].innerHTML = `${nbuRate.toFixed(2)}&#8372`;
                differenceRateField.children[1].innerHTML = `${differenceRates.toFixed(1)}%`;
                setTimeout(() => {popup.style.display = "none"}, 3000)
            }
        });
    }) 


    function setDealRate() {
        if (dealRate) {
            prevRateField.children[1].innerHTML = `${dealRate.toFixed(2)}&#8372`;
        };
    }

    function setRateDifference() {
        if (dealRate && typeof nbuRate === "number") {
            differenceRates = (dealRate / nbuRate - 1) * 100;
            differenceRateField.children[1].innerHTML = `${differenceRates.toFixed(1)}%`;
        };
    }

    async function getNbuRate() {
        try {
            const responseToNBU = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/dollar_info?json');
            const parsed = await responseToNBU.json();
            nbuRate = +(parsed[0].rate);
        } catch (e) {
            nbuRate = `Fetch error: ${e}`
        }
    }

    function setNbuRate() {
        if (typeof nbuRate === "number") {
            currentRateField.children[1].innerHTML = `${nbuRate.toFixed(2)}&#8372`;
            console.log(module, id);
        } else {
            console.log(nbuRate);
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

    

    // async function getDealEntity() {
    //     await ZOHO.embeddedApp.on("PageLoad", (data) => {
    //         id = data.EntityId;
    //         module = data.Entity;

    //         // ZOHO.CRM.API.getRecord({ Entity: module, RecordID: id })
    //         //     .then((data) => { 
    //         //         dealRate = +(data.data[0].Exchange_rates);
    //         //     });
    //     });
    // }

    // async function getDealRate() {
    //     ZOHO.CRM.API.getRecord({ Entity: module, RecordID: id }, {module, id})
    //             .then((data) => { 
    //                 dealRate = +(data.data[0].Exchange_rates);
    //                 console.log(dealRate);
    //             });
    // }

   