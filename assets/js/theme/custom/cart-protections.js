export async function cartProtections() {
  const items = document.querySelectorAll(".cart-item");
  let fifteenGallonKit = {};

  try {
    // get the cart details
    const cart = await getCart();
    // early return if cart is empty
    if (!cart.length) return;
    // get the physical items from the cart
    const cartItems = cart[0].lineItems.physicalItems;
    // get the kit details and disable the free item quantity
    disableQuantitySelection(items, fifteenGallonKit);
    // early return if there isn't a fifteenGallonKit element
    if (!fifteenGallonKit["element"]) return;
    // remove the free items from cart if the kit is removed from cart
    removeFreeItemsIfRemoveKit(fifteenGallonKit, cartItems, cart[0].id);
    // add a border to the bottom of the last element in the color bundle
    document.querySelectorAll(".bundledFlag")[
      document.querySelectorAll(".bundledFlag").length - 1
    ].parentElement.parentElement.parentElement.style.borderBottom =
      "1px solid #333";
  } catch (err) {
    console.error(err);
  }
}

async function getCart() {
  // get the current cart
  const res = await fetch("/api/storefront/carts");
  const data = await res.json();
  return data;
}

function disableQuantitySelection(items, fifteenGallonKit) {
  for (let item of items) {
    // grab price from cart item
    const price = Array.from(item.children).filter((child) =>
      child.className.includes("cart-item-info")
    )[0].children[1].innerText;
    let name = Array.from(item.children).filter((child) =>
      child.className.includes("cart-item-title")
    )[0].children[1].children[0].innerHTML;
    // if price does not exactly equal $0.00, then skip the rest of the function
    if (name.toLowerCase().includes("15 gallon project kit")) {
      fifteenGallonKit["element"] = item;
      fifteenGallonKit["name"] = name;
    }
    if (price !== "$0.00") continue;
    // grab the quantity field
    let quantity = Array.from(item.children).filter((child) =>
      child.className.includes("cart-item-quantity")
    )[0];
    // add the "bundled with" text
    addBundleFlagToLineItem(fifteenGallonKit["name"], item);
    // grab the buttons and inputs from the quantity
    let quantityBtns = Array.from(quantity.children[1].children);
    // disable each button and input value
    quantityBtns.forEach((btn) => (btn.disabled = true));
    // remove delete button and bottom-border from free items
    item.lastElementChild.style.display = "none";
    item.style.borderBottom = "none";
  }
}

function addBundleFlagToLineItem(name, item) {
  // create a paragraph element
  const flag = document.createElement("p");
  // give element class name for styling
  flag.className = "bundledFlag";
  // set the inner text to include the midcoat kit name
  flag.innerText = `BUNDLED WITH: ${name}`;
  // append the flag below the title of the color
  Array.from(item.children)
    .filter((child) => child.className.includes("cart-item-title"))[0]
    .children[1].appendChild(flag);
}

function createCustomRemoveBundleButton(element, kitId) {
  // create a td element to hold the button
  const removeBtn = document.createElement("td");
  // give the td a class name to match the default styles of the cart
  removeBtn.className = "cart-item-block cart-item-remove";
  // add our custom a tag to act as a remove button
  removeBtn.innerHTML = `<a class="remove-bundle" id="remove-${kitId}">Remove Bundle</a>`;
  // append the remove button to the element
  element.appendChild(removeBtn);
}

function removeFreeItemsIfRemoveKit(fifteenGallonKit, cartItems, cartId) {
  // grab the kit Id from the kit in the cart
  const kitId =
    fifteenGallonKit["element"].lastElementChild.lastElementChild.dataset
      .cartItemid;
  // remove the default delete button and border from midcoat kit
  fifteenGallonKit["element"].lastElementChild.style.display = "none";
  fifteenGallonKit["element"].style.borderBottom = "none";
  // add the custom remove button
  createCustomRemoveBundleButton(fifteenGallonKit["element"], kitId);

  // listen for removing the kit from cart
  document
    .getElementById(`remove-${kitId}`)
    .addEventListener("click", async function (e) {
      e.preventDefault();
      
      fetch(`/api/storefront/carts/${cartId}/items/${kitId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }).then(() => {
        const freeItems = cartItems.filter((item) => item.listPrice === 0);
        var recursivelyRemoveFreeItems = (cartId, freeItemIndex) =>
        // remove the free item at the freeItemIndex (index in the freeItems array from above)
          fetch(`/api/storefront/carts/${cartId}/items/${freeItems[freeItemIndex].id}`, { method: "DELETE", headers: { "Content-Type": "application/json"}}).then((res) => {
            // if freeItemIndex does NOT equal zero
            if (freeItemIndex) {
              // decrement freeItemIndex
              freeItemIndex--;
              // recall the function with the next free item at the new freeItemIndex
              return recursivelyRemoveFreeItems(cartId, freeItemIndex);
            }
            return
          });

        recursivelyRemoveFreeItems(cartId, freeItems.length - 1)
          .then((data) => console.log(data))
          // reloat after success
          .then(() => window.location.reload())
          .catch((error) => console.log(error));
      });
    });
}
