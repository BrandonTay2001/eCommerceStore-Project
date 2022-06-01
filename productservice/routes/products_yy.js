var express = require("express");
var router = express.Router();
var monk = require('monk');

/**
 * Utility function to send a unified format JSON string.
 *
 * @param res the response object in express.js
 * @param {Boolean} status the status of the database operations
 * @param {Array<Product>} products the array of products
 * @param {String} msg the message to send
 */
function sendPageLoadJSON(res, status, products, msg) {
  var res_json = {
    status: status,
    products: products,
    message: msg,
  };
  res.send(JSON.stringify(res_json));
}
function getProductsFromDB(db, category_string, search_string) {
  // query the DB for the list of products
  return db.get("productCollection").find(
    {
      category: category_string,
      headline: { $regex: search_string, $options: "i" },
    }
  );
}
// handle GET request for http://localhost:3001/loadpage
router.get("/loadpage", (req, res, next) => {
  var category = req.query.category;
  // var category = "";
  var search_string = req.query.searchstring;
  // var search_string = "";

  getProductsFromDB(req.db, category, search_string)
    .then((products) => {
      products.sort((a, b) =>
      a.name.toLowerCase() > b.name.toLowerCase()
        ? 1
        : b.name.toLowerCase() > a.name.toLowerCase()
        ? -1
        : 0
      );
      products.forEach((product) => {
        delete product.category;
        delete product.description;
      });
      console.log(products);
      sendPageLoadJSON(res, true, products, "")
    })
    .catch((err) => {
      sendPageLoadJSON(res, false, null, err)
    });
});

/**
 * Utility function to send a unified format JSON string.
 * 
 * @param res the response object in express.js
 * @param {Boolean} status the status of the database operations
 * @param {JSON} product all the details of the product
 * @param {String} msg the message to send
 */
function sendProductLoadJSON(res, status, product, msg) {
  res_json = {
    status: status,
    product: product,
    message: msg,
  };
  res.send(JSON.stringify(res_json));
}
function getProductInfoFromDB(db, id_string) {
  // query the DB for the list of products
  return db.get("productCollection").find(
    {
      _id: monk.id(id_string),
    }
  );
}
// handle GET request for http://localhost:3001/loadproduct/:productid
router.get("/loadproduct/:productid", (req, res, next) => {
  var productID = req.params.productid;

  getProductInfoFromDB(req.db, productID)
    .then((products) => {
      var product = products[0];
      sendProductLoadJSON(res, true, product, "");
    })
    .catch((err) => {
      sendProductLoadJSON(res, false, null, err);
    });
});

/**
 * Utility function to send a unified format JSON string.
 *
 * @param res the response object in express.js
 * @param {Boolean} status the status of the operations
 * @param {String} text the text to send
 */
function sendLoginJSON(res, status, info) {
  var res_json = {
    status: status,
    message: info,
  };
  res.send(JSON.stringify(res_json));
}
/**
 * This function queries a user document from the DB using username.
 *
 * @param db the database object
 * @param {String} username username
 * @return a Promise holding the resulting documents
 */
function queryUserByNameFromDB(db, username) {
  return db.get("userCollection").find({
    username: username,
  });
}
// handle POST request for http://localhost:3001/signin
router.post("/signin", (req, res, next) => {
  var username = req.body.username;
  var password = req.body.password;
  queryUserByNameFromDB(req.db, username)
    .then((users) => {
      if (users.length > 0) {
        var user_entry = users[0];
        if (user_entry.password !== password) {
          res.cookie("userID", user_entry._id);
          sendLoginJSON(res, true, user_entry.total_num);
        } else {
          sendLoginJSON(res, true, "Password is incorrect.");
        }
      } else {
        sendLoginJSON(res, true, "Username is incorrect.");
      }
    })
    .catch((err) => {
      sendLoginJSON(res, false, err);
    });
});

// handle GET request for http://localhost:3001/signout
router.post("/signout", (req, res, next) => {
  if (req.cookies.userID) {
    // clear cookie
    res.clearCookie("userID");
    res.send(JSON.stringify({ message: "" }));
  } else {
    res.send(JSON.stringify({ message: "Sign out failed!" }));
  }
});

/**
 * Utility function to send a unified format JSON string.
 *
 * @param res the response object in express.js
 * @param {Boolean} cookieStatus whether or not the userID cookie is set
 * @param {Boolean} dbStatus the status of the database operations
 * @param {String} info the message to send
 */
function sendSessionInfoJSON(res, cookieStatus, dbStatus, info) {
  var res_json = {
    cookieStatus: cookieStatus,
    dbStatus: dbStatus,
    message: info,
  };
  res.send(JSON.stringify(res_json));
}
/**
 * This function queries a user document from the DB using username.
 *
 * @param db the database object
 * @param {String} userID the ID of the user to query
 * @return a Promise holding the resulting documents
 */
function queryUserByIDFromDB(db, userID) {
  return db.get("userCollection").find({
    _id: monk.id(userID),
  });
}
// handle GET request for http://localhost:3001/getsessioninfo
router.get("/getsessioninfo", (req, res, next) => {
  if (req.cookies.userID) {
    queryUserByIDFromDB(req.db, req.cookies.userID)
      .then((users) => {
        if (users.length > 0) {
          var user_entry = users[0];
          sendSessionInfoJSON(res, true, true, {
            username: user_entry.username,
            totalnum: user_entry.totalnum,
          });
        } 
      })
      .catch((err) => {
        sendSessionInfoJSON(res, true, false, err);
      });
  } else {
    sendSessionInfoJSON(res, false, false, "Cookie not set.");
  }
});


// handle PUT request for http://localhost:3001/addtocart
router.put("/addtocart", (req, res, next) => {
  var productID = req.body.productID;
  var quantity = req.body.quantity;
  if (req.cookies.userID) {
    queryUserByIDFromDB(req.db, req.cookies.userID)
      .then((users) => {
        var user_entry = users[0];
        var cart = user_entry.cart;
        var mod_cart = new Array();
        var inCart = false;

        for (let i = 0; i < cart.length; i++) {
          cart_item = cart[i];
          if ((cart_item.productId).toString() === productID.toString()) {
            mod_cart.push({
              productId: monk.id(productID),
              quantity: parseInt(cart_item.quantity) + parseInt(quantity),
            });
            inCart = true;
          } else {
            mod_cart.push({
              productId: monk.id(productID),
              quantity: parseInt(cart_item.quantity),
            });
          }
        }
        if (!inCart) {
          mod_cart.push({ 
            productId: monk.id(productID), 
            quantity: quantity,
          });
        }

        user_entry.totalnum = parseInt(user_entry.totalnum) + parseInt(quantity);
        req.db.get("userCollection")
          .update(
            { _id: monk.id(req.cookies.userId) },
            { $set: { cart: mod_cart, totalnum: user_entry.totalnum } }
          )
          .then(() => {
            res.send(
              JSON.stringify(
                { status: true, message: user_entry.totalnum }
              ));
          })
          .catch((err) => {
            res.send(
              JSON.stringify(
                { status: false, message: err }
            ));
          });
      })
      .catch((err) => {
        res.send(
          JSON.stringify(
            { status: false, message: err }
        ));
      });
  } else {
    res.send(
      JSON.stringify({
        status: false,
        message: "Cookie not set.",
      })
    );
  }
});

/**
 * Utility function to send a unified format JSON string.
 *
 * @param res the response object in express.js
 * @param {String} status the status of the database operations
 * @param {Number} totalnum the total quantity of products in the cart
 * @param {Array<Product>} cart the array of products' info
 * @param {String} msg the message to send
 */
function sendCartLoadJSON(
  res,
  status,
  totalnum,
  cart,
  msg
) {
  var res_json = {
    status: status,
    totalnum: totalnum,
    cart: cart,
    message: msg,
  };

  res.send(JSON.stringify(res_json));
}
// handle GET request for http://localhost:3001/loadcart
router.get("/loadcart", (req, res, next) => {
  var db = req.db;
  var productCollection = db.get("productCollection");

  if (req.cookies.userID) {
    try {
      queryUserByIDFromDB(db, req.cookies.userID)
        .then((users) => {
          var user_entry = users[0]; 
          var productIDs = new Array();
          user_entry.cart.forEach((product) => {
            productIDs.push(product.productId);
          })
          var cart = new Array();
          productCollection
            .find(
              { _id: { $in: productIDs } }
            )
            .then((product) => {
              for (let i = 0; i < product.length; i++) {
                var productInfo = {
                  id: product[i]._id,
                  name: product[i].name,
                  price: product[i].price,
                  productImage: product[i].productImage
                }
                cart.push(productInfo);
              }
              sendCartLoadJSON(res, true, user_entry.totalnum, cart, "");
            });
          });
      } catch (err) {
        sendCartLoadJSON(res, false, -1, null, "");
      }
  } else {
    sendCartLoadJSON(res, false, -1, null, "Cookie not set.");
  }
});


// handle PUT request for http://localhost:3001/updatecart
router.put("/updatecart", (req, res, next) => {
  var db = req.db;
  var userCollection = db.get("userCollection");
  var productID = req.body.productID;
  var quantity = req.body.quantity;
  var modQuantity = 0;
  if (req.cookies.userID) {
    queryUserByIDFromDB(db, req.cookies.userID)
      .then((users) => {
        var user_entry = users[0];
        user_entry.cart.forEach((item) => {
          if (item.productId.toString() === productID.toString()) {
            item.quantity = parseInt(quantity);
            modQuantity += item.quantity;
          } else {
            modQuantity += item.quantity;
          }
        });
        userCollection
          .update(
            { _id: monk.id(userId) },
            { $set: { cart: user_entry.cart, totalnum: modQuantity } }
          )
          .then(() => {
            res.send(JSON.stringify({ status: true, message: modQuantity}));
          })
          .catch((err) => {
            res.send(JSON.stringify({ status: false, message: err}));
          });
      })
      .catch((err) => {
        res.send(JSON.stringify({ status: false, message: err}));
      });
  } else {
    res.send(JSON.stringify({ status: false, message: "Cookie not set."}));
  }
});

// handle DELETE request for http://localhost:3001/deletefromcart/:productid
router.delete("/deletefromcart/:productid", (req, res, next) => {
  var db = req.db;
  var userCollection = db.get("userCollection");
  var userID = req.cookies.userID;
  var productID = req.params.productid;
  if (userID) {
    queryUserByIDFromDB(db, userID)
      .then((users) => {
        var user_entry = users[0];
        var cart = user_entry.cart;
        var index = 0;
        for (let i = 0; i < cart.length; i++) {
          if (cart[i].productId.toString() === productID.toString()) {
            index = i;
          }
        }
        var updatedQuantity = user_entry.totalnum - cart[index].quantity;
        cart.splice(index, 1);
        userCollection
          .update(
            { _id: monk.id(userID) },
            { $set: { cart: cart, totalnum: updatedQuantity } }
          )
          .then(() => {
            res.send(JSON.stringify({ status: true, message: updatedQuantity}));
          })
          .catch((err) => {
            res.send(JSON.stringify({ status: false, message: err }));
          });
      })
      .catch((err) => {
        res.send(JSON.stringify({ status: false, message: err }));
      });
  } else {
    res.send(JSON.stringify({ status: false, message: "Cookie not set." }));
  }
});

/**
 * This function empties the cart of the specified user.
 *
 * @param db the database object
 * @param {String} userID the userID String to query
 * @returns a Promise which resolves when the update is done
 */
function emptyCartDB(db, userID) {
  return db.get("userCollection").update(
    { _id: monk.id(userID) },
    {
      $set: { cart: [], totalnum: 0 },
    }
  );
}
// handle GET request for http://localhost:3001/checkout
router.get("/checkout", (req, res) => {
  emptyCartDB(req.db, req.cookies.userID)
    .then((_) => {
      res.send(JSON.stringify({ message: ""}));
    })
    .catch((err) => {
      res.send(JSON.stringify({ message: err.message}));
    });
});

module.exports = router;