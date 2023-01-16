let rsaver_placeid

function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
};

async function notification(title, message) {
    await chrome.runtime.sendMessage({
        type: "notification",
        title: title,
        message: message
    })
}

function makePurchase(productID, price, sellerID, csrf, dataItemID) {
    let postData
    if (dataItemID !== 0) {
        postData = JSON.stringify({
            expectedCurrency: 1,
            expectedPrice: price,
            expectedSellerId: sellerID,
            userAssetId: dataItemID
        })
    } else {
        postData = JSON.stringify({
            expectedCurrency: 1,
            expectedPrice: price,
            expectedSellerId: sellerID,
            expectedPromoId: 0,
            userAssetId: 0,
            saleLocationType: "Game",
            saleLocationId: rsaver_placeid
        })
    }
    return fetch(
            `https://economy.roblox.com/v1/purchases/products/${productID}?1`, {
                method: "POST",
                headers: {
                    "X-CSRF-TOKEN": csrf,
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: postData,
            })
        .then((resq) => {
            return resq.json();
        })
};

(async () => {
    let storageData = await chrome.storage.local.get()

    if (!storageData.totalSaved) storageData.totalSaved = 0
    if (!storageData.placeid) storageData.placeid = 0
    rsaver_placeid = storageData.placeid

    function saveData(object) {
        chrome.storage.local.set(object)
    }

    saveData(storageData)

    let PurchaseButton = await waitForElm(".PurchaseButton")
    PurchaseButton = $(PurchaseButton)
    console.log("init rSaver")

    let requireRobux = $(".text-robux-lg")
    let robuxContainer = $(".icon-robux-price-container")
    if (requireRobux.text() === "") return
    requireRobux = parseInt(requireRobux.text())

    let savedRobux = Math.floor(requireRobux * 0.4)
    let productID = PurchaseButton.attr("data-product-id")
    let price = PurchaseButton.attr("data-expected-price")
    let sellerID = PurchaseButton.attr("data-expected-seller-id")
    let userAssetID = PurchaseButton.attr("data-userasset-id")

    let imgSrc = ""
    if ($("span.thumbnail-span > img").length > 0) {
        imgSrc = $("span.thumbnail-span > img")[0].src
    }

    let CSRF_Token = ""
    if ($('meta[name="csrf-token"]').length > 0) {
        CSRF_Token = $('meta[name="csrf-token"]').attr("data-token")
    }

    let type = ""
    if ($(".icon-limited-label").length > 0 || $(".icon-limited-unique-label").length > 0) {
        type = "limiteds"
    } else {
        type = "items"
    }

    if (!storageData.placeid || rsaver_placeid == 0) {
        robuxContainer.append(`<span class="rsaver-savingRobux">(⚠ set placeid!)</span>`)
        return
    }

    if (type !== "limiteds") {
        robuxContainer.append(`<span class="rsaver-savingRobux">(💰${savedRobux})</span>`)
    }

    $(document.body).on("click", () => {
        if ($("#confirm-btn").length > 0) {
            let confirmButton = $("#confirm-btn") //decline-btn confirm-btn
            let clone = confirmButton.clone()
            clone.prependTo(confirmButton.parent())
            confirmButton.remove()
            clone.on("click", (e) => {
                e.preventDefault()
                if (type == "limiteds") {
                    if (confirmButton.text() == "Buy Now") {
                        makePurchase(productID, price, sellerID, CSRF_Token, userAssetID)
                            .then((resp) => {
                                setTimeout(() => window.location.reload(), 500);
                            });
                    }
                } else {
                    if (confirmButton.text() == "Buy Now") {
                        $("#simplemodal-container").remove()
                        makePurchase(productID, price, sellerID, CSRF_Token, 0)
                            .then((resp) => {
                                console.log(resp)
                                if (savedRobux !== 0) {
                                    notification("Saved robux from RoSaver!" ,"You saved " + savedRobux + " robux by using RoSaver!")
                                    console.log("sent!")
                                    setTimeout(() => window.location.reload(), 500);
                                }
                            })
                    }
                }
            })
        }
    });

})();