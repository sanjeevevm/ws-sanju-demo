import { useEffect, useState } from "react";
import {
  extend,
  render,
  View,
  useExtensionInput,
  BlockStack,
  Button,
  BuyerConsent,
  CalloutBanner,
  Heading,
  Image,
  Text,
  TextContainer,
  Separator,
  Select,
  Tiles,
  TextBlock,
  Layout,
} from "@shopify/post-purchase-ui-extensions-react";
import { APiCall } from "./Api";
import axios from "axios";

/* For local development, replace APP_URL with your local tunnel URL. */
const APP_URL = "https://489f-183-182-87-129.ngrok-free.app";
//const APP_URL = "https://wiser.expertvillagemedia.com";

/* Preload data from your app server to ensure the extension loads quickly. */
extend(
  "Checkout::PostPurchase::ShouldRender",
    async ({ inputData, storage }) => {
      //console.log(" INPUT DATA ");
      //console.log(inputData);
      //CAll();
      /* For local development we will set our upsell to always render. */
      return { render: true };
    }
);

// For local development we will set our upsell to always render.
render("Checkout::PostPurchase::Render", () => <App />);
export function App() {  
    const { storage, inputData, calculateChangeset, applyChangeset, done } = useExtensionInput();
    const [loading, setLoading] = useState(true);
    const [calculatedPurchase, setCalculatedPurchase] = useState();  
    const [buyerConsent, setBuyerConsent] = useState(false);
    const [buyerConsentError, setBuyerConsentError] = useState();
    const [selectedPurchaseOption, setSelectedPurchaseOption] = useState(0);  
    const [offersdata, setOffersData] = useState([]);  
    const [customiZation, setCustomiZation] = useState([]);  
    const [adata, setAData] = useState({});
    const [customization, setCustomization] = useState({});  
    const [offerSettings, setOfferSettings] = useState({});  
    const [funnelID, setFunnelID] = useState(0);  
    const [timer, setTimer] = useState(0);
    const [offerTimer, setofferTimer] = useState(5);
    const [offerTimerN, setOfferTimerN] = useState(180);
    const [timeSet, setTimeSet] = useState(0);
    const [loaderMsg, setLoaderMsg] = useState('Loading...');
    
    const CAll = async () => {
      const item_array = Array();
      for(var i = 0; i < inputData.initialPurchase.lineItems.length; i++) {
        item_array[i] = inputData.initialPurchase.lineItems[i].product.id;
      }
      var lineitem = (inputData.initialPurchase.lineItems[0].product.id);
      var shop_name = (inputData.shop.domain);
      const result = await APiCall(shop_name, JSON.stringify(item_array));      
      if(result.offers === ''){
        declineOffer();
      }  
      try {
        setAData(result);
        setCustomization(JSON.parse(result.customization));
        setOfferSettings(JSON.parse(result.offer_description));
        setFunnelID(result.FunnelId);
        setOfferTimerN(result.timerCount);
      } catch (error) {          
        let errorMessage = result.errormsg;
        let upsellData = JSON.stringify(result.offers);
        let funnelID = result.FunnelId;
        storeErrorLogs(JSON.stringify(inputData),JSON.stringify(funnelID),JSON.stringify(upsellData),JSON.stringify(errorMessage)); 
        console.log('DATA ERROR');
        console.log(error);
        return false;       
        declineOffer();
      }      
    };

    useEffect(() => {        
        CAll();
        try {
            const commonResponse = fetch('https://wiser-ai.expertvillagemedia.com/api/post-purchase-common', {
              method: "POST",
              headers: 
              {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Allow": "OPTIONS, GET, HEAD, POST"
              },
              body: JSON.stringify({
                Shop: inputData.shop.domain,
                userAction: 'All',
                funnelId: funnelID
              }),
            })
            .then((response) => response.text());
        }catch (error) {                        
            const commonResponse = fetch('https://wiser-ai.expertvillagemedia.com/api/post-purchase-error-log', {
                method: "POST",
                headers: 
                {
                  "Content-Type": "application/json",
                  "Access-Control-Allow-Origin": "*",
                  "Allow": "OPTIONS, GET, HEAD, POST"
                },      
                body: JSON.stringify({
                  Shop: inputData.shop.domain,
                  funnelId: funnelID,
                  lineItems: inputData.initialPurchase.lineItems,
                  upsell_data: result.offers,
                  error_message:error
                }),
            })
            .then((response) => response.text());
            

            declineOffer();
        }
    }, [funnelID]);


    // Define the changes that you want to make to the purchase, including the discount to the product.
    useEffect(() => {
      if(!adata || !adata.offers) return;
      async function calculatePurchase() {
        // Call Shopify to calculate the new price of the purchase, if the above changes are applied.
        const result = await calculateChangeset({
          changes: purchaseOptions[selectedPurchaseOption].changes,
        });
        setCalculatedPurchase(result.calculatedPurchase);
        setLoading(false);
      }
      calculatePurchase();
    }, [selectedPurchaseOption, adata]);


    /** SET TIMER CALLING  */
    useEffect(() => {
      if(!adata || !adata.offers) return;
        // Set the duration of the timer (in seconds)        
        const duration = offerTimerN;
        // Calculate the remaining time
        const endTime = new Date().getTime() + duration * 1000;
        // Update the timer every second
        const interval = setInterval(() => {
        const currentTime = new Date().getTime();
        const remainingTime = Math.max(0, endTime - currentTime);
        const remainingSeconds = Math.floor(remainingTime / 1000);
        // Update the timer value
        setTimer(remainingSeconds);
        // Stop the timer when it reaches 0
        if (remainingSeconds === 0) {
          declineOffer();        
          clearInterval(interval);
        }
      }, 1000);
      // Clean up the interval on component unmount
      return () => {      
        clearInterval(interval);
      };
    }, [adata, offerTimerN]);


    // added because initially adata will be false
    if(!adata || !adata.offers)   
    
    return <>
              <Layout>
                <Text variant="bodyLg" as="p" alignment="center" size="medium">{loaderMsg}</Text>
              </Layout>
          </>;    
    
    // Extract values from the calculated purchase.
    const dataObject = adata.offers;
    const purchaseOptions = adata.offers;
    const purchaseOption = purchaseOptions[selectedPurchaseOption];  
    const shipping = customization.shipping_charge?customization.shipping_charge:0;
    const taxes = calculatedPurchase?.addedTaxLines[0]?.priceSet?.presentmentMoney?.amount;
    const discountedPrice = purchaseOption.discountedPrice ? purchaseOption.discountedPrice : 0.0;
    const originalPrice = purchaseOption.originalPrice? purchaseOption.originalPrice:0;
    const total = originalPrice - discountedPrice ;
    const wsProductId = purchaseOption.product_id;
    const wsProductName = purchaseOption.productTitle;
    const grandTotal = parseFloat(total)+parseFloat(shipping);
    const discountTitle = '';//(purchaseOption.changes[0].discount.title != '') ? purchaseOption.changes[0].discount.title : '';

    /**ACCEPT OFFER CODE*/
    async function acceptOffer() {
      
      setLoading(true);    
      var ProArrId = purchaseOptions[selectedPurchaseOption].id;    
      const cdata = adata.offers[selectedPurchaseOption];    
      const changesval = cdata['changes'];
      console.log("changesval");
      console.log(changesval);
      // Make a request to your app server to sign the changeset with your app's API secret key.
      const token = await fetch(`${APP_URL}/api/sign-changeset`, {
        method: "POST",
        mode: "cors",
        headers: 
        { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Allow": "OPTIONS, GET, HEAD, POST"
        },      
        body: JSON.stringify({
          referenceId: inputData.initialPurchase.referenceId,
          changes: purchaseOptions[selectedPurchaseOption].id,
          token: inputData.token,
          changeval: changesval
        }),
      })
      .then((response) => response.json())
      .then((response) => response.token)
      .catch((e) => console.log(e));

      // Send the value of the buyer consent with the changeset to Shopify to add the subscription
      const result = await applyChangeset(token, {
        buyerConsentToSubscriptions: buyerConsent,
      });

      //console.log("result");
      //console.log(result);

      //return false;
      
      discountedPrice.trim().length;
      //if(discountedPrice!=''){
      try{  
          const airesponse = await fetch('https://wiser-ai.expertvillagemedia.com/api/post-purchase-logs', {
            method: "POST",
            mode: "cors",
            headers: 
            { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Allow": "OPTIONS, GET, HEAD, POST"
            },      
            body: JSON.stringify({
              lineItems: inputData.initialPurchase.lineItems,
              product_id: wsProductId,
              product_name:wsProductName,
              upsell_data: changesval,        
              discountedPrice: discountedPrice,
              originalPrice: originalPrice,
              totalPrice: total,
              Shop: inputData.shop.domain,
              Country: inputData.initialPurchase.destinationCountryCode,
              OrderID:inputData.initialPurchase.referenceId,
              inputData:JSON.stringify(inputData),
              //CurrencyCode: inputData.initialPurchase.lineItems[0].totalPriceSet.presentmentMoney.currencyCode,
              CustomerID: inputData.initialPurchase.customerId,
              userAction: 'Accepted',
              funnelId: funnelID,
            }),
          }).then((response) => response.text()).catch((e) => console.log(e));
      } catch (error) {

      }
           
      // Ensure that there is no buyer consent error
      if (result.errors.find((error) => error.code === "buyer_consent_required")) {
        // Show an error if the buyer didn't accept the subscriptions policy
        setBuyerConsentError("You need to accept the subscriptions policy.");
        setLoading(false);      
      } else {
        // Redirect to the thank you page.
        done();
      }
      // Redirect to the thank-you page.
      done();
    }

    /** DECLINE BUTTON CODE */
    function declineOffer() {
        try {
          const decResponse = fetch('https://wiser-ai.expertvillagemedia.com/api/post-purchase-logs', {
            method: "POST",
            mode: "cors",
            headers: 
            { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
              "Allow": "OPTIONS, GET, HEAD, POST"
            },      
            body: JSON.stringify({
              lineItems: inputData.initialPurchase.lineItems,
              upsell_data: adata.offers,        
              discountedPrice: discountedPrice,
              originalPrice: originalPrice,
              product_id: wsProductId,
              product_name:wsProductName,
              totalPrice: total,
              OrderID:inputData.initialPurchase.referenceId,
              inputData:JSON.stringify(inputData),
              Shop: inputData.shop.domain,
              CurrencyCode: inputData.initialPurchase.lineItems[0].totalPriceSet.presentmentMoney.currencyCode,
              Country: inputData.initialPurchase.destinationCountryCode,
              CustomerID: inputData.initialPurchase.customerId,
              userAction: 'Decline',
              funnelId: funnelID
            }),
          })
          .then((resp) => resp.text())    
          .catch((e) => console.log(e));
        } catch (error) {

        }

        /** SHOW 4 NEW ITEMS AFTER CANCEL DECLINE BUTTON (DOWNSELL CODE) */
        /*
        fetch(`https://wiser-ai.expertvillagemedia.com/api/post-purchase-downsell`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(
              `This is an HTTP error: The status is ${response.status}`
            );
          }
          return response.json();
        })
        .then((actualData) => console.log(actualData))
        .catch((err) => {
          console.log(err.message);
        });
        */

        /** DOWN SELL GOES HERE */
        done();
    }

    /** RENDER POST PURCHASE PAGE */
    return (
      <BlockStack spacing="loose">
        <CalloutBanner emphasized >
          <TextContainer>
              <Text size="large" emphasized>
                {customization.widget_title}
              </Text>
          </TextContainer>       

          <BlockStack spacing="xtight">          
            <TextContainer>
              <Text size="small" >            
               {" "}            
              </Text>

              <Text>            
                 {customization.widget_subtitle} {purchaseOption.productTitle} {" "}            
              </Text>
              
            </TextContainer>

            <TextContainer>              
              <Text size="medium">
                {discountTitle}
              </Text>
            </TextContainer>
            
            <TextContainer>
              <Text size="medium" emphasized>
                {offerSettings.timer_text} {" "}  
                {Math.floor(timer / 60)}:              
                {(timer % 60).toString().padStart(2, "0")}
              </Text>
            </TextContainer>
          </BlockStack>
        </CalloutBanner>
        <Layout
          media={[
            { viewportSize: "small", sizes: [1, 0, 1], maxInlineSize: 0.9 },
            { viewportSize: "medium", sizes: [532, 0, 1], maxInlineSize: 420 },
            { viewportSize: "large", sizes: [560, 38, 340] },
          ]}
        >
        <Image
            description="product photo"
            source={purchaseOption.productImageURL}
        />
        <BlockStack />
          <BlockStack spacing="loose">
            <BlockStack>
              <Heading>{purchaseOption.productTitle}</Heading>
              <PriceHeader
                discountedPrice={total}
                originalPrice={originalPrice}
              />
              <ProductDescription textLines={purchaseOption.productDescription} />
            </BlockStack>
            {purchaseOptions.length > 1 && (
              <Select
                label="Purchase Options"
                onChange={(value) =>
                  setSelectedPurchaseOption(parseInt(value, 10))
                }
                value={selectedPurchaseOption.toString()}
                options={purchaseOptions.map((option, index) => ({
                  label: option.title,
                  value: index.toString(),
                }))}
              />
            )}
            {purchaseOption.changes[0].type === "add_subscription" && (
              <BlockStack spacing="xtight">
                <TextBlock subdued size="small">
                  Delivery{" "}
                  {getBillingInterval(purchaseOption.sellingPlanInterval)}, Save{" "}
                  {purchaseOption.changes[0].discount.value}%
                </TextBlock>
                <TextBlock subdued size="small">
                  Auto-renews, skip or cancel anytime
                </TextBlock>
              </BlockStack>
            )}
            <BlockStack spacing="tight">
              <Separator />
              <MoneyLine
                label="Subtotal"
                amount={total}
              />
              <MoneyLine label="Shipping" amount={shipping} />
              <MoneyLine label="Taxes" amount={taxes} />
              <Separator />
              <BlockStack spacing="tight">
                <MoneySummary label="Total" amount={formatCurrency(grandTotal)} />
                {purchaseOption.sellingPlanInterval && (
                  <RecurringSummary
                    label="Recurring subtotal"
                    amount={purchaseOption.originalPrice}
                    interval={purchaseOption.sellingPlanInterval}
                  />
                )}
              </BlockStack>
            </BlockStack>
            {purchaseOption.changes[0].type === "add_subscription" && (
              <BuyerConsent
                policy="subscriptions"
                checked={buyerConsent}
                onChange={setBuyerConsent}
                error={buyerConsentError}
              />
            )}
            <BlockStack>
              <Button onPress={acceptOffer} submit loading={loading}>
                {customization.add_to_cart_text} · {formatCurrency(total)}
              </Button>
              <Button onPress={declineOffer} subdued>
                {customization.decline_text}
              </Button>
            </BlockStack>
          </BlockStack>
        </Layout>
      </BlockStack>
    );
}

function PriceHeader({ discountedPrice, originalPrice }) {
  if(discountedPrice == originalPrice){
    return (
      <TextContainer alignment="leading" spacing="loose">
        <Text size="large">
          {formatCurrency(originalPrice)}
        </Text>
        
      </TextContainer>
    );
  }else{
    return (
      <TextContainer alignment="leading" spacing="loose">
        <Text role="deletion" size="large">
          {formatCurrency(originalPrice)}
        </Text>
        <Text emphasized size="large" appearance="critical">
          {" "}
          {formatCurrency(discountedPrice)}
        </Text>
      </TextContainer>
    );
  }
}

function ProductDescription({ textLines }) {
  return (
    <BlockStack spacing="xtight">
      {textLines.map((text, index) => (
        <TextBlock key={index} subdued>
          {text}
        </TextBlock>
      ))}
    </BlockStack>
  );
}

function MoneyLine({ label, amount, size = "small" }) {
  return (
    <Tiles>
      <TextBlock size={size}>{label}</TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size={size}>
          {formatCurrency(amount)}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function MoneySummary({ label, amount }) {
  return (
    <Tiles>
      <TextBlock size="medium" emphasized>
        {label}
      </TextBlock>
      <TextContainer alignment="trailing">
        <TextBlock emphasized size="medium">
          {amount}
        </TextBlock>
      </TextContainer>
    </Tiles>
  );
}

function RecurringSummary({ label, amount, interval }) {
  return (
    <BlockStack spacing="xtight">
      <Tiles>
        <TextBlock size="small">{label}</TextBlock>
        <TextContainer alignment="trailing">
          <TextBlock size="small" subdued>
            {formatCurrency(amount)} {getBillingInterval(interval)}
          </TextBlock>
        </TextContainer>
      </Tiles>
      <TextBlock size="small" subdued>
        Doesn&apos;t include shipping, tax, duties, or any applicable discounts.
      </TextBlock>
    </BlockStack>
  );
}

function getBillingInterval(interval) {
  switch (interval) {
    case "DAY":
      return "every day";
    case "WEEK":
      return "every week";
    case "MONTH":
      return "every month";
    case "YEAR":
      return "every year";
  }
}

function formatCurrency(amount) {
  if (!amount || parseInt(amount, 10) === 0) {
    return "0";
  }
  return `$${amount}`;
}

function storeErrorLogs(inputData,funnelID,upsellData,errorMessage){
      const commonResponse = fetch('https://wiser-ai.expertvillagemedia.com/api/post-purchase-error-log', {
          method: "POST",
          mode: "cors",
          headers: 
          {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Allow": "OPTIONS, GET, HEAD, POST"
          },      
          body: JSON.stringify({
            Shop: "inputData.shop.domain",
            funnelId: funnelID,
            lineItems: "inputData.initialPurchase.lineItems",
            upsell_data: upsellData,
            error_message:errorMessage
          }),
      })
      .then((response) => response.text());
}