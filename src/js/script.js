/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
  'use strict';

  const select = {
    templateOf: {
      menuProduct: '#template-menu-product',
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
        input: 'input[name="amount"]',
        linkDecrease: 'a[href="#less"]',
        linkIncrease: 'a[href="#more"]',
      },
    },
  };

  const classNames = {
    menuProduct: {
      wrapperActive: 'active',
      imageVisible: 'active',
    },
  };

  const settings = {
    amountWidget: {
      defaultValue: 1,
      defaultMin: 1,
      defaultMax: 9,
    }
  };

  const templates = {
    menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
  };

  class Product {
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

      console.log('new Product:', thisProduct);
    }

    renderInMenu(){
      const thisProduct = this;
      /*generate HTML based on template */
      const generatedHTML = templates.menuProduct(thisProduct.data);
      /* create element using utils.createElementFromHTML */
      thisProduct.element = utils.createDOMFromHTML(generatedHTML);
      /* find menu container */
      const menuContainer = document.querySelector(select.containerOf.menu);
      /* add element to menu */
      menuContainer.appendChild(thisProduct.element);
    }

    getElements(){
      const thisProduct = this;
    
      thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
      thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
      thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
      thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
      thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
      thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
      thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
    }
    
    initAccordion(){
      const thisProduct = this;
      //  console.log('thisProduct ', thisProduct);
  
      /* find the clickable trigger (the element that should react to clicking) */
      thisProduct.accordionTrigger.addEventListener('click', clicableTrigger);
      //  console.log('clicableTrigger', clicableTrigger);
  
      /* START: click event listener to trigger */
      function clicableTrigger(event){

        /* prevent default action for event */
        event.preventDefault();
      
        /* toggle active class on element of thisProduct */
        thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
        //   console.log('thisProduct.element ',thisProduct.element);
        
        /* find all active products */
        const activeProducts = document.querySelectorAll(select.all.menuProductsActive);
        //  console.log('activeProduct ', activeProducts);

        /* START LOOP: for each active product */
        for (let active of activeProducts) {
          //   console.log('active ', active);

          /* START: if the active product isn't the element of thisProduct */
          if (active != thisProduct.element){
            /* remove class active for the active product */
            active.classList.remove(classNames.menuProduct.wrapperActive);
            /* END: if the active product isn't the element of thisProduct */
          }
        /* END LOOP: for each active product */
        }
      /* END: click event listener to trigger */
      }
    }

    initOrderForm(){
      const thisProduct = this;
      //  console.log('initOrderForm');

      thisProduct.form.addEventListener('submit', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
      
      for(let input of thisProduct.formInputs){
        input.addEventListener('change', function(){
          thisProduct.processOrder();
        });
      }
      
      thisProduct.cartButton.addEventListener('click', function(event){
        event.preventDefault();
        thisProduct.processOrder();
      });
    }

    initAmountWidget(){
      const thisProduct = this;

      thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
    }

    processOrder(){
      const thisProduct = this;
      //   console.log('processOrder');
      const formData = utils.serializeFormToObject(thisProduct.form);
      //   console.log('formData', formData);

      /* Create const 'price' with default prices */
      let price = thisProduct.data.price;
      //   console.log('price: ',price);

      /* START LOOP: for each params */
      for(let paramId in thisProduct.data.params) {
        const param = thisProduct.data.params[paramId];

        /* START LOOP: for each options of param */
        for (let optionId in param.options){
          //    console.log('optionId, optionId');

          const option = param.options[optionId];
          const optionSelected = formData.hasOwnProperty(paramId) && formData[paramId].indexOf(optionId) > -1;

          /* create const images with all image */
          const images = thisProduct.imageWrapper.querySelectorAll('.' + paramId + '-' + optionId);

          /* if check options isn't default, product price increase */
          if (!option.default && optionSelected){
            /* price increase */
            price = price + option.price;
            //    console.log('price', price);
          /* if this option, which is the default, is not checked, product price decrease */
          } else if (option.default && !optionSelected){
            /* price decrease */
            price = price - option.price;
            //    console.log('price', price);
          }

          /* Visible images */
          if (optionSelected){
            for ( let image of images){
              /* add selected options of params at the order Product */
              image.classList.add(classNames.menuProduct.imageVisible);
            }
          } else {
            for ( let image of images){
              /* remove unselected options of params at the order Product */
              image.classList.remove(classNames.menuProduct.imageVisible);
            }
          }
          /* END LOOP: for each options of param */
        }
        /* END LOOP: for each params */
      }
      /* update price thisProduct.priceElem */
      thisProduct.priceElem.innerHTML = price;
      //    console.log('thisProduct.priceElem', thisProduct.priceElem);
    }

  }

  class AmountWidget{
    constructor(element){
      const thisWidget = this;
      thisWidget.getElements(element);
      thisWidget.setValue(thisWidget.input.value);
      console.log('AmountWidget:', thisWidget);
      console.log('constructor arguments:', element);
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

      /* TODO: Add validation */

      thisWidget.value = newValue;
      thisWidget.input.value = thisWidget.value;
    }
  }  

  const app = {
    initData: function(){
      const thisApp = this;

      thisApp.data = dataSource;
    },

    initMenu: function(){
      const thisApp = this;
      console.log('thisApp.data:', thisApp.data);

      for(let productData in thisApp.data.products){
        new Product(productData, thisApp.data.products[productData]);
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
      thisApp.initMenu();
    },
  };

  app.init();
}