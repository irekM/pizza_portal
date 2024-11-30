/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
      cartProduct: '#template-cart-product', // CODE ADDED
    },
    containerOf: {
      menu: '#product-list',
      cart: '#cart',
    },
    all: {
      menuProducts: '#product-list > .product',
      menuProductsActive: '#product-list > .product.active',
      formInputs: 'input, select',
    },
    menuProduct: {
      clickable: '.product__header',
      form: '.product__order',
      priceElem: '.product__total-price .price',
      imageWrapper: '.product__images',
      amountWidget: '.widget-amount',
      cartButton: '[href="#add-to-cart"]',
    },
    widgets: {
      amount: {
        input: 'input.amount', // CODE CHANGED
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
    // CODE ADDED START
    cart: {
      productList: '.cart__order-summary',
      toggleTrigger: '.cart__summary',
      totalNumber: `.cart__total-number`,
      totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
      subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
      deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
      form: '.cart__order',
      formSubmit: '.cart__order [type="submit"]',
      phone: '[name="phone"]',
      address: '[name="address"]',
    },
    cartProduct: {
      amountWidget: '.widget-amount',
      price: '.cart__product-price',
      edit: '[href="#edit"]',
      remove: '[href="#remove"]',
    },
    // CODE ADDED END
  };
  
  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
    // CODE ADDED START
    cart: {
      wrapperActive: 'active',
    },
    // CODE ADDED END
  };
  
  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }, // CODE CHANGED
    // CODE ADDED START
    cart: {
      defaultDeliveryFee: 20,
    },
    // CODE ADDED END
    db: {
      url: '//localhost:3131',
      products: 'products',
      orders: 'orders',
    }
  };
  
  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
    // CODE ADDED START
    cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
    // CODE ADDED END
  };

  class Product{
    constructor(id, data){
      const thisProduct = this;

      thisProduct.id = id;
      thisProduct.data = data;

      thisProduct.renderInMenu();
      thisProduct.getElements();
      thisProduct.initAccordion();
      thisProduct.initOrderForm();
      thisProduct.initAmountWidget();
      thisProduct.processOrder();
      

      //console.log('new Product:', thisProduct);
    }

    renderInMenu(){
      const thisProduct = this;

      /*generate HTML basen on template*/
      const generatedHTML = templates.menuProduct(thisProduct.data);

      /*create element using utils.createElementFromHTML*/
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);

      /*find menu container*/
      const menuContainer = document.querySelector(select.containerOf.menu);

      /*add element to menu*/
      menuContainer.appendChild(thisProduct.element);
    }

    getElements(){
      const thisProduct = this;

      thisProduct.dom = {};

      thisProduct.dom.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      //console.log('Accordion trigger:', thisProduct.accordionTrigger);
      thisProduct.dom.form = thisProduct.element.querySelector(select.menuProduct.form);
      //console.log('Form:', thisProduct.form);
      thisProduct.dom.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      //console.log('Form inputs:', thisProduct.formInputs);
      thisProduct.dom.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      //console.log('Cart button:', thisProduct.cartButton);
      thisProduct.dom.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      //console.log('Price element:', thisProduct.priceElem);
      thisProduct.dom.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }

    initAccordion(){
      const thisProduct = this;

      /*find the clickable trigger (the element that should react to click)*/
      // const clickableTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);

      /* START: add event listener to clickable trigger on event click*/
      thisProduct.dom.accordionTrigger.addEventListener('click', function(event){
      /*prevent default action for event*/
        event.preventDefault();

      /*find active product (product that has active class)*/
        const activeProduct = document.querySelector(select.all.menuProductsActive);

      /*if there is active product and it's not thisProduct.element, remove class active from it */
        if(activeProduct && activeProduct !== thisProduct.element) {
          activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
        }

      /* toggle active class on thisProduct.element */
      thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
      });
      
    }

    initOrderForm(){
      const thisProduct = this;
      //console.log('initOrderForm:');
      thisProduct.dom.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
      
      for(let input of thisProduct.dom.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }
      
      thisProduct.dom.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
        thisProduct.addToCart();
      });
    }

    processOrder(){
      const thisProduct = this;
      //console.log('processOrder:', thisProduct);
      // covert form to object structure e.g. { sauce: ['tomato'], toppings: ['olives', 'redPeppers']}
      const formData = utils.serializeFormToObject(thisProduct.dom.form);
      //console.log('formData', formData);

      // set price to default price
      let price = thisProduct.data.price;

      // for every category (param)...
      for(let paramId in thisProduct.data.params){
        // determine param value, e.g. paramId = 'toppings', param = { label: 'Toppings', type: 'checkboxes'... }
        const param = thisProduct.data.params[paramId];
        //console.log(paramId, param);

        // for every option in this category
        for(let optionId in param.options){
          // determine option value, e.g. optionId = 'olives', option = { label: 'Olives', price: 2, default: true }
          const option = param.options[optionId];
          //console.log(optionId, option);

          // check if there is param with a name of paramId in formData and if it includes optionId
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);

          //option is selected but is not defauld
          if (optionSelected) {
            if (!option.default) {
              //add option price to price variable
              price += option.price;
            }
          } else {
            //option is not selected but is default
            if (option.default) {
              //substract option price from price variable
              price -= option.price;
            }
          }
        }
      }
      /* multiply price by amount */
      price *= thisProduct.amountWidget.value;
      //zapisanie pojedyńczej sztuki ceny
      thisProduct.priceSingle = price / thisProduct.amountWidget.value;
      // update calculated price in the HTM
      thisProduct.dom.priceElem.innerHTML = price;
    }

    initAmountWidget(){
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.dom.amountWidgetElem);
      thisProduct.dom.amountWidgetElem.addEventListener('updated', function(){
        thisProduct.processOrder();
      });
    }

    addToCart(){
      const thisProduct = this;
      //przygotowanie obiektu z danymi produktu
      const productSummary = thisProduct.prepareCartProduct();
      //dodanie produktu do koszyka
      app.cart.add(productSummary);
    }

    prepareCartProduct(){
      const thisProduct = this;

      const productSummary = {
        id: thisProduct.id,
        name: thisProduct.data.name,
        amount: thisProduct.amountWidget.value,
        priceSingle: thisProduct.priceSingle,
        price: thisProduct.price,
        params: thisProduct.prepareCartProductParams(),
      };



      return productSummary;
    }

    prepareCartProductParams(){
      const thisProduct = this;

      const formData = utils.serializeFormToObject(thisProduct.form);
      const params = {};

      //for every category param
      for(let paramId in thisProduct.data.params){
        const param = thisProduct.data.params[paramId];

        //create category param in params const eg.params = { ingredients: { name: 'Ingredients', options: {}}}
        params[paramId] = {
          label: param.label,
          options: {}
        }
        //for every option in this category
        for(let optionId in param.options){
          const option = param.options[optionId];
          const optionSelected = formData[paramId] && formData[paramId].includes(optionId);

          //option is selected
          if(optionSelected) {
            //if true add to params[paramId.options] - label or diffrent value
            params[paramId].options[optionId] = option.label;
          }
        }
      }
      return params
    }
  }

  class AmountWidget{
    constructor(element){
      const thisWidget = this;

      //console.log('AmountWidget:', thisWidget);
      //console.log('constructor arguments:', element);

      thisWidget.getElements(element);

      if(thisWidget.input.value) {
        thisWidget.setValue(thisWidget.input.value);
      } else {
        thisWidget.setValue(settings.amountWidget.defaultValue);
      }
      
      thisWidget.initActions();  

      }

      getElements(element){
        const thisWidget = this;

        thisWidget.element = element;
        thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
        thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
        thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
      }

      setValue(value){
        const thisWidget = this;

        const newValue = parseInt(value);

        /*TODO: Add validation*/
        if(thisWidget.value !== newValue && !isNaN(newValue)
        &&
        newValue >= settings.amountWidget.defaultMin
        &&
        newValue <= settings.amountWidget.defaultMax) {

          thisWidget.value = newValue;
          thisWidget.announce();
        }
        
        thisWidget.input.value = thisWidget.value;
      }
      
      initActions(){
        const thisWidget = this;

        thisWidget.input.addEventListener('change', function(){
          thisWidget.setValue(thisWidget.input.value);
        });

        thisWidget.linkDecrease.addEventListener('click', function(event){
          event.preventDefault();
          thisWidget.setValue(thisWidget.value - 1);
        });

        thisWidget.linkIncrease.addEventListener('click', function(event){
          event.preventDefault();
          thisWidget.setValue(thisWidget.value + 1);
        });
      }

      announce(){
        const thisWidget = this;

        const event = new CustomEvent('updated', {
          bubbles: true
        });
        thisWidget.element.dispatchEvent(event);
      }
  }

  
  class Cart{
    constructor(element){
      const thisCart = this;

      thisCart.products = [];
      thisCart.getElements(element);
      thisCart.initActions;

      //console.log('new cart', thisCart);
    }

    getElements(element){
      const thisCart = this;

      thisCart.dom = {};
      thisCart.dom.wrapper = element;

      thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
      
      //referencja do listy produktów w koszyku
      thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);
      //referencja do elementu z kosztem przesylki
      thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(select.cart.deliveryFee);
      // Dodanie referencji do elementu pokazującego sumę cen bez kosztów przesyłki
      thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(select.cart.subtotalPrice);
       // Dodanie referencji do elementów pokazujących cenę końcową (uwzględniającą przesyłkę)
      thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(select.cart.totalPrice);

      // Dodanie referencji do elementu pokazującego liczbę sztuk produktów
      thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(select.cart.totalNumber);
    }

    initActions(){
      const thisCart = this;
      
      thisCart.dom.toggleTrigger.addEventListener('click', function(){
        thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
      });

      thisCart.dom.productList.addEventListener('updated', function(){
        thisCart.update();
      });

      thisCart.dom.productList.addEventListener('remove', function(event){
        thisCart.remove(event.detail.cartProduct);
      });
    }

    add(menuProduct){
      const thisCart = this;

      //przygotowywanie danych produktu i generowanie HTML dla produktu w koszyku
      const generatedHTML = templates.cartProduct(menuProduct);

      //zmiana HTML na DOM
      const generatedDOM = utils.createDOMFromHTML(generatedHTML);

      //dodanie produktu do listy w koszyku
      thisCart.dom.productList.appendChild(generatedDOM);
      //console.log('adding product', menuProduct);
      thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
      //console.log('thisCart.products', thisCart.products);

      thisCart.update();// Wywołujemy update po dodaniu produktu do koszyka
    }

    update(){
      const thisCart = this;

      const deliveryFee = settings.cart.defaultDeliveryFee;
      let totalNumber = 0;
      let subtotalPrice = 0;

      for(let product of thisCart.products){
        totalNumber += product.amount; //zwieksza liczbe sztuk
        subtotalPrice += product.price; //zwieksza sume cen produktów
      }

      if(totalNumber > 0){
        thisCart.totalPrice = subtotalPrice + deliveryFee; //jak sa produkty dodajemy dostawe
      } else{
        thisCart.totalPrice = 0; //jesli nie ma produktow to cena na 0
      }
      //aktualizacja wartosci w koszyku
      thisCart.dom.totalNumber.innerHTML = totalNumber;
      thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;
      thisCart.dom.deliveryFee.innerHTML = totalNumber > 0 ? deliveryFee : 0;

      for (let totalPriceElem of thisCart.dom.totalPrice){
        totalPriceElem.innerHTML = thisCart.totalPrice;
      }

      console.log('totalNumber:', totalNumber);
      console.log('subtotalPrice:', subtotalPrice);
      console.log('deliveryFee:', deliveryFee);
      console.log('totalPrice:', thisCart.totalPrice);
    }

    remove(cartProduct){
      const thisCart = this;
      //szukanie indexu w tablicy this.cartProducts
      const indexOfProduct = thisCart.products.indexOf(cartProduct);
      //usuwanie produktu jestli jest w koszyku
      if (indexOfProduct !== -1) {
        thisCart.products.splice(indexOfProduct, 1);
      }
      //usuwanie elementu dom
      cartProduct.dom.wrapper.remove();
      //aktualizacja koszyja
      thisCart.update();
    }

  }  

  class CartProduct{
    constructor(menuProduct, element){
      const thisCartProduct = this;

      thisCartProduct.id = menuProduct.id;
      thisCartProduct.name = menuProduct.name;
      thisCartProduct.amount = menuProduct.amount;
      thisCartProduct.priceSingle = menuProduct.priceSingle;
      thisCartProduct.price = menuProduct.price;
      thisCartProduct.params = menuProduct.params;

      //przyupisanie elementu dom
      thisCartProduct.getElements(element);
      //wywolanie metody dla widgetu ilosci
      thisCartProduct.initAmountWidget();
      thisCartProduct.initActions();

      //console.log('new CartProduct', thisCartProduct);

    }

    getElements(element){
      const thisCartProduct = this;

      //stworzenie pustego obiektu dom
      thisCartProduct.dom = {};

      //przypisanie wrappera do obiektu dom
      thisCartProduct.dom.wrapper = element;

      //stworzenie referencji do obiektów we wrapperze

      thisCartProduct.dom.amountWidget = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.amountWidget);
      thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.price);
      thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.edit);
      thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.remove);
    }

    initAmountWidget(){
      const thisCartProduct = this;
      
      thisCartProduct.amountWidget = new AmountWidget(thisCartProduct.dom.amountWidget);
      
      thisCartProduct.dom.amountWidget.addEventListener('updated', function(){
       //aktualizacja wartosci amount
       thisCartProduct.amount = thisCartProduct.amountWidget.value;
       //obliczanie nowej ceny
       thisCartProduct.price = thisCartProduct.amount * thisCartProduct.priceSingle;
       //aktualizacja ceny html
       thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
      });
    }

    remove(){
      const thisCartProduct = this;

      const event = new CustomEvent('remove', {
        bubbles: true,
        detail: {
          cartProduct: thisCartProduct,
        },
      });

      thisCartProduct.dom.wrapper.dispatchEvent(event);
    }

    initActions(){
      const thisCartProduct = this;
      
      thisCartProduct.dom.edit.addEventListener('click', function(){
        event.preventDefault();
      });

      thisCartProduct.dom.remove.addEventListener('click', function(){
        event.preventDefault();
        thisCartProduct.remove();
      });
    }

  }

  const app = {
    initData: function(){
      const thisApp = this;
  
      thisApp.data = {};
      const url = settings.db.url + '/' + settings.db.products;

      fetch(url)
        .then(function(rawResponse){
          return rawResponse.json();
        })
        .then(function(parsedResponse){
          console.log('parsedResponse', parsedResponse);

          thisApp.data.products = parsedResponse;
          thisApp.initMenu();


        });
        console.log('thisApp.data', JSON.stringify(thisApp.data));
    },

    initCart: function(){
      const thisApp = this;

      const cartElem = document.querySelector(select.containerOf.cart);
      thisApp.cart = new Cart(cartElem);
    },

    initMenu: function(){
      const thisApp = this;
      //console.log('this.data:', thisApp.data);
      // const testProduct = new Product();
      // console.log('testProduct:', testProduct);

      for(let productData in thisApp.data.products){
        new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
      }
    },

    init: function(){
      const thisApp = this;
      console.log('*** App starting ***');
      console.log('thisApp:', thisApp);
      console.log('classNames:', classNames);
      console.log('settings:', settings);
      console.log('templates:', templates);

      thisApp.initData();
      
      thisApp.initCart();
    },

    
  };

  app.init();

}
