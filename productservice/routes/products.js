// Brandon Tay Jian Wei (3035767102)

// Some ideas for minor improvements of the backend suggested by: Md Abdullah Al Mahin (3035767528)

var express = require("express");
var router = express.Router();
var monk = require('monk');

// this method retrieves information for the list page based on search string and category
// return json contains: errorMsg, sentArr (array of objects of products to be displayed)
// OK
router.get("/loadpage", (req, res) => {
  var db = req.db;
  var productCollection = db.get("productCollection");
  var categorySearch = req.query.category;
  var toSearch = req.query.searchstring;

  // search productCollection for matching entries
  productCollection.find({category: {$regex: categorySearch}, name: {$regex: toSearch, $options: "i"}}).then((data) => {
    
    // sort in correct order for easier handling on client side
    data.sort((a, b) => {
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      }
      else if (b.name.toLowerCase() > a.name.toLowerCase()) {
        return -1;
      }
      else {
        return 0;
      }
    });

    // straightforward way to remove fields from object
    // idea credit: Md Abdullah Al Mahin (3035767528)
    data.forEach((item) => {
      delete item.category;
      delete item.description;
    });

    var toSend = data;
    res.json({errorMsg: "None", sentArr: toSend});
  }).catch((err) => {
    res.json({errorMsg: err, sentArr: new Array()});
  });
});

// this method retrieves information on a product based on the productid
// return json contains: errorMsg, prodRetrieved (see explanation below)
// OK
router.get("/loadproduct/:productid", (req, res) => {
  var db = req.db;
  var productCollection = db.get("productCollection");
  var prodId = req.params.productid;

  productCollection.find({_id: monk.id(prodId)}).then((data) => {
    var prodToSend = data[0]; // object
    console.log(prodToSend);

    // instead of just sending the manufacturer and description, we also send all 
    // information related to the product so the product page can be displayed in a more
    // straightforward way
    res.json({errorMsg: "None", prodRetrieved: prodToSend});
  }).catch((err) => {
    res.json({errorMsg: err, prodRetrieved: null});
  });
});

// this method sets the cookies during a sign in and returns necessary data on the user
// return json contains: errorMsg, totalnum, user (for easier handling at the front end)
// OK
router.post("/signin", (req, res) => {
  var db = req.db;
  var usernameInReq = req.body.username;
  var passwordInReq = req.body.password;
  var userCol = db.get("userCollection");

  userCol.find({username: usernameInReq, password: passwordInReq}).then((data) => {
    if (data.length !== 0) {
      var userMatched = data[0];
      res.cookie("userId", userMatched._id);
      
      // also send the current user as well for easier handling at the front end
      // idea credit: Md Abdullah Al Mahin (3035767528)
      res.json({errorMsg: "None", totalnum: userMatched.totalnum, user: userMatched});
    }
    else {
      res.json({errorMsg: "Login failure", totalnum: -1, user: null});
    }
  }).catch((err) => {
    res.json({errorMsg: err, totalnum: -1, user: null});
  });
});

// this method clears the cookies and sends an empty response
// returns: empty string
// OK
router.post("/signout", (req, res) => {
  res.clearCookie("userId");
  res.send("");
});

// this method retrieves the totalnum and username of the user (for easier parsing on the frontend)
// return json contains: errorMsg, totalnum, username 
// OK
router.get("/getsessioninfo", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");
  
  if (req.cookies.userId) { // cookies set
    userCol.find({_id: req.cookies.userId}).then((data) => {
      if (data.length !== 0) {
        var userMatched = data[0];

        // also send the username for easier parsing on the frontend (at the greeting part)
        // idea source: Md Abdullah Al Mahin (3035767528)
        res.json({errorMsg: "None", totalnum: userMatched.totalnum, username: userMatched.username});
      } 
      else {
        res.json({errorMsg: "User not found", totalnum: -1, username: null});
      }
    }).catch((err) => {
      res.json({errorMsg: err, totalnum: -1, username: null});
    });
  } 
  else {
    res.json({errorMsg: "Cookie not set", totalnum: 0, username: null});
  }
});

// this method adds a product to the user's cart
// return json contains: errorMsg, totalnum
// DONE
router.put("/addtocart", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");
  var prodId = req.body.productId;
  var qty = req.body.quantity;

  if (req.cookies.userId) { // if cookies are set
    userCol.find({_id: req.cookies.userId}).then((data) => {
      var userCart = data[0].cart;
      var found = false;
      var toReturn = new Array(); // adding to a new array
      var numBefore = data[0].totalnum;

      for (var i = 0; i < userCart.length; i++) {
        if ((userCart[i].productId).toString() === prodId.toString()) {
          toReturn.push({productId: monk.id(prodId), quantity: parseInt(userCart[i].quantity) + parseInt(qty)});
          found = true; // item is found in cart
        }
        else {
          toReturn.push({productId: monk.id(userCart[i].productId), quantity: parseInt(userCart[i].quantity)});
        }
      }
      if (!found) {
        console.log("added here");
        toReturn.push({productId: monk.id(prodId), quantity: parseInt(qty)});
      }

      // change the db entry and send a response
      userCol.update({_id: monk.id(req.cookies.userId)}, {$set: {cart: toReturn, totalnum: parseInt(numBefore) + parseInt(qty)}}, 
        () => {
          res.json({errorMsg: "None", totalnum: parseInt(numBefore) + parseInt(qty)});
      })
    }).catch((err) => {
      console.log(err);
      res.json({errorMsg: err, totalnum: -1});
    })
  }
  else {  // cookies not set yet
    res.json({errorMsg: "Cookie not set", totalnum: -1});
  }
})

// this method retrieves information on the user's cart and its products
// return json contains:
// errorMsg: any error message
// cart: the user's cart
// totalnum: the total items in the cart
// prodInfo: array of details of the products in the cart
// OK
router.get("/loadcart", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");
  var productCol = db.get("productCollection");

  if (req.cookies.userId) { // cookies set
    try {
      userCol.find({_id: monk.id(req.cookies.userId)}).then((userInfo) => {
        var prodInfoArray = new Array();
        var prods = new Array();
        userInfo[0].cart.forEach((prod) => {
          prods.push(prod.productId); // add to an arbitrary array
        })
        
        // find according to elements in prods array
        productCol.find({_id: {$in: prods}}).then((prodInfo) => {
          for (var i = 0; i < prodInfo.length; i++) {
            var addToArr = {
              id: prodInfo[i]._id,
              name: prodInfo[i].name,
              price: prodInfo[i].price,
              productImage: prodInfo[i].productImage
            }
            prodInfoArray.push(addToArr); // add to array as objects
          }

          // output format
          var returnObj = {
            errorMsg: "None",
            cart: userInfo[0].cart,
            totalnum: userInfo[0].totalnum,
            productInfo: prodInfoArray
          };
          res.json(returnObj);
        });
      });
    } catch (err) {
      res.json({errorMsg: err, cart: null, totalnum: -1, productInfo: null});
    }
  }
  else {
    res.json({errorMsg: "Cookie not set", cart: null, totalnum: -1, productInfo: null});
  }
})

// this method updates the quantity of a product in the cart
// return json contains: errorMsg, totalnum
// OK
router.put("/updatecart", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");

  userCol.find({_id: monk.id(req.cookies.userId)}).then((data) => {
    var newCart = new Array();
    var total = 0;  // running sum of total items
    data[0].cart.forEach((product) => {
      if ((product.productId).toString() === (req.body.productId).toString()) {
        var toAdd = {
          productId: monk.id(product.productId),
          quantity: parseInt(req.body.quantity)
        }
        newCart.push(toAdd);  // updated information is pushed
        total += parseInt(req.body.quantity);
      }
      else {
        newCart.push(product);  // original object pushed
        total += parseInt(product.quantity);
      }
    })

    userCol.update({_id: monk.id(req.cookies.userId)}, {$set: {
      cart: newCart,
      totalnum: total
    }}).then(() => {
      res.json({errorMsg: "None", totalnum: total});
    }).catch((err) => {
      console.log(err);
      res.json({errorMsg: err, totalnum: -1});  
    })
  }).catch((err) => {
    console.log(err);
    res.json({errorMsg: err, totalnum: -1});
  })
})

// this method handles checkouts by resetting a cart
// returns: an empty string or error message
// OK
router.get("/checkout", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");

  // reset user cart and totalnum
  userCol.update({_id: monk.id(req.cookies.userId)}, {$set: {cart: new Array(), totalnum: 0}}).then(() => {
    res.send("");
  }).catch((err) => {res.send(err)})
})

// this method deletes a product from the cart
// return json contains: errorMsg, totalnum
// OK
router.delete("/deletefromcart/:productid", (req, res) => {
  var db = req.db;
  var userCol = db.get("userCollection");

  userCol.find({_id: monk.id(req.cookies.userId)}).then((data) => {
    var newCart = new Array();
    var toReduce = 0;
    data[0].cart.forEach((product) => {
      if ((product.productId).toString() === (req.params.productid).toString()) {
        toReduce = parseInt(product.quantity);  // amount to be reduced
      }
      else {
        newCart.push({productId: monk.id(product.productId), quantity: parseInt(product.quantity)});
      }
    })

    // update information in db
    userCol.update({_id: req.cookies.userId}, {$set: {
      cart: newCart,
      totalnum: parseInt(data[0].totalnum) - toReduce
    }}).then(() => {
      // updated totlanum is returned
      res.json({errorMsg: "None", totalnum: parseInt(data[0].totalnum) - toReduce});
    }).catch((err) => {
      res.json({errorMsg: err, totalnum: -1});  
    })
  }).catch((err) => {
    res.json({errorMsg: err, totalnum: -1});
  })
})

module.exports = router;
