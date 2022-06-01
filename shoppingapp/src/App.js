// Brandon Tay Jian Wei (3035767102)

// The frontend was discussed with:
// Md Abdullah Al Mahin (3035767528), Richard Bryan (3035812438), Yoo Yuen Yau (3035832440)
// Concepts and improvements were discussed but coding was done separately

// needed imports
import {FaSearch, FaShoppingCart, FaCheckCircle, FaChevronLeft, FaChevronRight} from "react-icons/fa";
import React from "react";
import "./App.css";
import $ from "jquery";

// this component represents the login page
// OK!
class LoginComponent extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            username: "", password: "", loginStatus: 0
        }
        this.loginAndReturn = this.loginAndReturn.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.updatePwd = this.updatePwd.bind(this);
        this.signInLocal = this.signInLocal.bind(this);
    }

    // local async method that sends a sign in request to the server, resolution of promise for later handlling
    signInLocal(usernameInput, pwdInput) {
        return new Promise((resolve, reject) => {
            $.ajax({
                type: "POST", dataType: "json", xhrFields: {withCredentials: true},
                url: "http://localhost:3001/signin", data: {username: usernameInput, password: pwdInput},
                success: (returned) => {
                    if (returned.errorMsg === "None") {
                        this.setState({loginStatus: 1});
                        resolve("OK");
                    } else {
                        if (returned.errorMsg === "Login failure") {
                            alert("Login failure");
                            resolve("Error");
                        }
                    }
                }
            })
        })
    }

    // for signing in globally and returning to the previous page
    loginAndReturn() {
        console.log(this.state.username);
        this.signInLocal(this.state.username, this.state.password).then((data) => {
            if (data === "OK") {
                console.log("its ok!")
                this.props.signin(this.state.username, this.state.password);
                this.props.returnPrev();
            }
        });
    };

    // updates the username state as component is changed
    updateUser(evt) {
        var val = evt.target.value;
        this.setState({
            username: val
        })
    }

    // updates the password state as component is changed
    updatePwd(evt) {
        const val = evt.target.value;
        this.setState({
            password: val
        })
    }

    render() {  // renders the component
        return (
            <div className="loginSpaceWrap">
                <div id="loginSpace">
                    <div className="usernameSpace">
                        Username:
                        <input id="usernameField" type="text" value={this.state.username} 
                        onChange={(e) => {this.updateUser(e)}}/>
                    </div>
                    <div className="usernameSpace">
                        Password:
                        <input id="passwordField" type="text" value={this.state.password}
                        onChange={(e) => {this.updatePwd(e)}} />
                    </div>
                    <div className="signInWrap">
                    <button className="buttonClicked" id="singInButtonPage2" onClick={() => {
                        if (this.state.username === "" || this.state.password === "") {
                            alert("You must enter username and password");
                        } else {
                            // no errors
                            this.loginAndReturn()
                        }
                    }}>Sign In</button></div>
                    <button id="return" onClick={() => {this.props.returnPrev()}}><FaChevronLeft />Go Back</button>
                </div>
            </div>
        );
    }
}

// this component represents the cart portion
class ShoppingCart extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            // aggregateArr contains information needed for each row (ie. price, quantity, name, image etc.)
            aggregateArr: [], totalSum: 0, paidStatus: 0, totalnum: this.props.user.totalnum
        }
        this.loadCart = this.loadCart.bind(this);
        this.modifyCart = this.modifyCart.bind(this);
    }

    // get the cart information from server during mounting
    componentDidMount() {
        this.loadCart();
    }

    // method to get cart information from server
    loadCart() {
        $.ajax({
            type: "GET", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/loadcart",
            success: (data) => {
                if (data.errorMsg === "None") {
                    var cart = data.cart;
                    var sum = 0;
                    var prodInfoArray = data.productInfo;
                    var totalnum = 0;
                    var rows = new Array(); // represents a row of information

                    // counting the total sum and total items
                    for (var i = 0; i < cart.length; i++) {
                        for (var j = 0; j < prodInfoArray.length; j++) {
                            if ((cart[i].productId).toString() === (prodInfoArray[j].id).toString()) {
                                console.log(cart[i].productId);
                                rows.push({
                                    name: prodInfoArray[j].name, image: prodInfoArray[j].productImage, prodId: cart[i].productId,
                                    price: prodInfoArray[j].price, quantity: cart[i].quantity
                                });
                                sum += (prodInfoArray[j].price * cart[i].quantity);
                                totalnum += cart[i].quantity;
                            }
                        }
                    }
                    this.setState({totalnum: totalnum, totalSum: sum, aggregateArr: rows}, () => {
                        console.log(this.state, "state");   // error-checking code
                    });
                }
            }
        })
    }

    // this method dynamically changes the quantity at the database
    // resolution of promise for later handling
    modifyCart(prodId, qtyToUpdate) {
        return new Promise((resolve, reject) => {
            if (qtyToUpdate == 0) {
                $.ajax({
                    type: "DELETE", dataType: "json", xhrFields: {withCredentials: true},
                    url: "http://localhost:3001/deletefromcart/" + prodId,
                    success: (returned) => {
                        if (returned.errorMsg === "None") {
                            this.setState({
                                totalnum: returned.totalnum
                            });
                            resolve(returned.totalnum);
                        }
                    }
                })
            } else {
                // ok
                $.ajax({
                    type: "PUT", dataType: "json", xhrFields: {withCredentials: true},
                    url: "http://localhost:3001/updatecart", data: {productId: prodId, quantity: qtyToUpdate},
                    success: ((returned) => {
                        if (returned.errorMsg === "None") {
                            this.setState({totalnum: returned.totalnum});
                            resolve(returned.totalnum);
                        }
                    })
                })
            }
        })
    }

    render() {  // rendering the component
        var showCart, total, wrapper;
        if (this.state.totalnum > 0) {  // if cart is non-empty
            showCart = 
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            <th></th>
                            <th>Price:</th>
                            <th>Quantity:</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* rendering each individual row */}
                        {this.state.aggregateArr.map((prod) => {
                            return (
                                <tr>
                                    <td><img src={"http://localhost:3001/" + prod.image} height={170} width={170}/></td>
                                    <td>{prod.name}</td>
                                    <td>${prod.price}</td>
                                    <td><input type="number" defaultValue={prod.quantity} min="0" onChange={(e) => {
                                        this.modifyCart(prod.prodId, e.target.value).then((newTotal) => {
                                            this.props.updateTotalnum(newTotal);
                                            this.loadCart();
                                        });
                                    }}/></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            
            total = <p>Cart subtotal ({this.state.totalnum} item(s)): ${this.state.totalSum}</p>
        }
        else {  // cart is empty
            showCart = <p>Your cart is empty</p>
            total = <p></p>
        }

        if (this.state.paidStatus === 0) {  // not paid
            wrapper = 
                <div>
                    <div id="cart">
                        {showCart}
                    </div>
                    <div id="total">
                        {total}
                    </div>
                    <div>
                        <button id="buttonBelow" onClick={() => {
                            this.props.returnPrev();
                        }}><FaChevronLeft />Go back</button>
                        <button className="buttonClicked" onClick={() => {
                            if (this.state.aggregateArr.length > 0) {
                                this.props.checkOut();
                                // reset the state to render the next page
                                this.setState({aggregateArr: [], paidStatus: 1});
                                this.props.updateTotalnum(0);
                            }
                        }}>Proceed to check out</button>
                    </div>
                </div>
        } else {    // paid
            wrapper = 
                <div>
                    <FaCheckCircle />
                    <p>You have successfully placed order for {this.state.totalnum} item(s)</p>
                    <p>${this.state.totalSum} paid</p>
                    <div className="paidButton">
                    <button className="buttonClicked" onClick={() => {
                        this.props.changePage(1, -1);   // changes to list page
                        this.state.totalSum = 0;
                    }}>Continue browsing<FaChevronRight /></button></div>
                </div>
        }

        return (
            <div id="cartWrap">{wrapper}</div>
        );
    }
}

// parent component for the entire web app
class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            prevRendered: 2, currPage: 1, loginStatus: 0, prodCategory: "All", listedProducts: [], currProduct: null,
            currUser: null, strToSearch: "", prodId: 0, errorMsg: "None", totalnum: 0, username: "", addedStatus: 0,
            prodInfoArray: [], paidStatus: 0
        }
        this.returnPrev = this.returnPrev.bind(this);
        this.changePage = this.changePage.bind(this);
        this.signIn = this.signIn.bind(this);
        this.signOut = this.signOut.bind(this);
        this.addProdToCart = this.addProdToCart.bind(this);
        this.setProductList = this.setProductList.bind(this);
        this.setCurrProduct = this.setCurrProduct.bind(this);
        this.searchProducts = this.searchProducts.bind(this);
        this.resetAdded = this.resetAdded.bind(this);
        this.checkOut = this.checkOut.bind(this);
        this.updateTotalnum = this.updateTotalnum.bind(this);
    }

    // set the title of the web app during mount
    componentDidMount() {
        document.title = "iShop";
    }

    // for changing the totalnum state (passed into child components)
    updateTotalnum(newNum) {
        this.setState({totalnum: newNum}, () => {
            console.log(this.state.totalnum);
        });
    }

    // returns to previous page
    returnPrev() {
        this.changePage(this.state.prevRendered, -1);
    }

    // global sign in method
    signIn(usernameInput, pwdInput) {
        $.ajax({
            type: "POST", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/signin", data: {username: usernameInput, password: pwdInput},
            success: (returned) => {
                console.log(returned);
                if (returned.errorMsg === "None") {
                    this.setState({errorMsg: returned.errorMsg, loginStatus: 1, currUser: returned.user, 
                        totalnum: returned.totalnum});
                } else {
                    if (returned.errorMsg === "Login failure") {
                        alert("Login failure");
                    }
                    this.setState({errorMsg: returned.errorMsg});
                }
            }
        })
    }

    // changes to a new page via change of state
    changePage(pageToRender, prodId) {
        var currPage = this.state.currPage;
        if (prodId === -1) {
            // prodId refers to the current or latest product that has been viewed individually
            prodId = this.state.prodId;
        }
        this.setState({currPage: pageToRender, prevRendered: currPage, prodId: prodId});
    }

    // resets the 'added to cart' status
    resetAdded() {
        this.setState({addedStatus: 0});
    }

    // signs out the current user
    signOut() {
        $.ajax({
            type: "POST", dataType: "text", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/signout", data: {},
            success: () => {
                (this.state.currPage === 3) ? 
                    this.setState({loginStatus: 0, prevRendered: this.state.currPage, currPage: 1}) : 
                    this.setState({loginStatus: 0});
                console.log("success");
            }, failure: () => {console.log("problem here")}
        })
        console.log("running");
    }

    // adds a product to cart and re-renders the page
    // DONE
    addProdToCart(qty) {
        $.ajax({
            type: "PUT", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/addtocart", data: {productId: this.state.prodId, quantity: qty},
            success: (data) => {
                this.setState({errorMsg: data.errorMsg, totalnum: parseInt(data.totalnum), addedStatus: 1});
            }
        })
    }

    // sets the product list, re-renders page
    setProductList() {
        var temp;
        if (this.state.prodCategory === "All") {
            temp = "";
        }

        $.ajax({
            type: "GET", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/loadpage?category=" + temp + "&searchstring=" + this.state.strToSearch,
            success: (data) => {
                if (data.errorMsg === "None") {
                    this.setState({errorMsg: data.errorMsg, listedProducts: data.sentArr});
                } else {
                    this.setState({errorMsg: data.errorMsg})
                }
            }
        })
    }

    // if individual product to be viewed, this changes the current product state
    setCurrProduct() {
        $.ajax({
            type: "GET", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/loadproduct/" + this.state.prodId,
            success: (data) => {
                if (data.errorMsg === "None") {
                    this.setState({errorMsg: data.errorMsg, currProduct: data.prodRetrieved});
                } else {this.setState({errorMsg: data.errorMsg});}
            }
        })
    }

    // for searching of products via category and search string, re-renders page later
    searchProducts(categoryToSearch, strToSearch) {
        this.setState({categoryToSearch: categoryToSearch, strToSearch: strToSearch})
        var temp = categoryToSearch;
        if (temp === "All") {
            temp = "";
        }
        $.ajax({
            type: "GET", dataType: "json", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/loadpage?category=" + temp + "&searchstring=" + strToSearch,
            success: (data) => {
                if (data.errorMsg === "None") {
                    this.setState({errorMsg: data.errorMsg, listedProducts: data.sentArr});
                } else {
                    this.setState({errorMsg: data.errorMsg});
                }
                this.setState({prevRendered: this.state.currPage, currPage: 1});
            }
        })
    }

    // checkout function
    checkOut() {
        $.ajax({
            type: "GET", dataType: "text", xhrFields: {withCredentials: true},
            url: "http://localhost:3001/checkout",
            success: (msg) => {
                if (msg === "") {
                    this.setState({paidStatus: 0});
                } else {
                    this.setState({errorMsg: msg});
                }
            }
        })
    }

    // rendering the parent component
    render() {
        var temp = this.state.currProduct;
        if (this.state.currProduct === null) {
            for (var i = 0; i < this.state.listedProducts.length; i++) {
                if (this.state.listedProducts[i]._id === this.state.prodId) {
                    temp = this.state.listedProducts[i];
                }
            }
        }
        if (this.state.currPage === 1) {    // list page
            return (
                <div id="header">
                    <HeadingComponent changePage={this.changePage} signOut={this.signOut} user={this.state.currUser}
                    loginStatus={this.state.loginStatus} searchProducts={this.searchProducts}
                    prodCategory={this.state.prodCategory} strToSearch={this.state.strToSearch} totalnum={this.state.totalnum}
                    resetAdded={this.resetAdded} />
                    <ListPage listedProducts={this.state.listedProducts} changePage={this.changePage} 
                    setProductList={this.setProductList} />
                </div>
            );
        } else if (this.state.currPage === 2) { // product page
            return (
                <div id="header">
                    <HeadingComponent changePage={this.changePage} signOut={this.signOut} user={this.state.currUser}
                    loginStatus={this.state.loginStatus} searchProducts={this.searchProducts}
                    prodCategory={this.state.prodCategory} strToSearch={this.state.strToSearch} totalnum={this.state.totalnum}
                    resetAdded={this.resetAdded}/>
                    <ProductPage currProduct={temp} changePage={this.changePage} addProduct={this.addProdToCart}
                    addedStatus={this.state.addedStatus} setCurrProduct={this.setCurrProduct} 
                    loginStatus={this.state.loginStatus} resetAdded={this.resetAdded}/>
                </div>
            )
        } else if (this.state.currPage === 3) { // cart page
            console.log(this.state.currUser);
            return (
                <div id="header">
                    <HeadingComponent changePage={this.changePage} signOut={this.signOut} user={this.state.currUser}
                    loginStatus={this.state.loginStatus} searchProducts={this.searchProducts} totalnum={this.state.totalnum} 
                    prodCategory={this.state.prodCategory} strToSearch={this.state.strToSearch}
                    resetAdded={this.resetAdded}/>
                    <ShoppingCart loadCart={this.loadCart} prodInfoArray={this.state.prodInfoArray} user={this.state.currUser}
                    changePage={this.changePage} checkOut={this.checkOut} returnPrev={this.returnPrev}
                    updateTotalnum={this.updateTotalnum} />
                </div>
            );
        } else if (this.state.currPage === 4) { // login page
            return (
                <div>
                    <LoginComponent signin={this.signIn} returnPrev={this.returnPrev} loginStatus={this.state.loginStatus}/>
                </div>
            );  
        }
    }
}

// OK
// the heading component at the top of every page
function HeadingComponent(props) {
    var variable;   // variable changes according to contents of page
    console.log(props.loginStatus);
    if (props.loginStatus === 0) {  // not logged in
        variable = 
            <div id="loginVariable">
                <button className="buttonClicked" id="signInHome" onClick={() => {props.changePage(4, -1)}}>Sign In</button>
            </div>
    } else {    // logged in
        variable = 
            <div id="loginVariable" onClick={() => {
                props.changePage(3, -1);
                props.resetAdded();
            }}>
                <div id="cartArea">
                    <button class="buttonClicked" id="cartIcon" onClick={() => {
                        props.changePage(3, -1);
                        props.resetAdded();
                    }}>
                        <FaShoppingCart id="cartIconItself"/>
                    </button>
                        <div className="headingText">
                            <p id="inCartText">{props.totalnum} in Cart</p>
                        </div>
                </div>
                <div className="headingText" id="greetingDiv">
                    <p id="greetingText">Hello, <b>{props.user.username}</b></p>
                </div>
                <div><button className="buttonClicked" id="signOut" onClick={() => {
                    props.signOut();
                    props.resetAdded();
                }}>Sign Out</button></div>
            </div>
    }

    var categoryToSearch = props.prodCategory;
    var strToSearch = props.strToSearch;
    return (    // rendering the heading component
        <div id="headingComponent">
            <div id="categories">
                <p className={"categoryText"} onClick={() => {props.searchProducts("Phones", "")}}>Phones</p>
                <p className={"categoryText"} onClick={() => {props.searchProducts("Laptops", "")}}>Laptops</p>
                <p className={"categoryText"} onClick={() => {props.searchProducts("Tablets", "")}}>Tablets</p>
            </div>
            <div id="searchBarDiv">
                <select id="dropdown" onChange={(e) => {categoryToSearch = e.target.value}}>
                    <option value="All">All</option>
                    <option value="Phones">Phones</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Laptops">Laptops</option>
                </select>
                <input id="searchBar" onChange={(e) => {strToSearch = e.target.value}} defaultValue={strToSearch}/>
                <button id="searchButton" onClick={() => {props.searchProducts(categoryToSearch, strToSearch)}}>
                    <FaSearch />
                </button>
          </div>
          {/* content of variable changes according to login status */}
          {variable}
        </div>
    );
}

// component represents the details of an individual product on the list page
// OK
function IndividualProduct(props) {
    return (
        <div onClick={() => {props.func(2, props.obj._id)}} className="product">
            <img src={"http://localhost:3001/" + props.obj.productImage} className={"prodImage"} height={250} width={250} />
            <p className="prodDetails">{props.obj.name}</p>
            <p className="prodDetails">${props.obj.price}</p>
        </div>
    );
}

// list page component
// DONE
class ListPage extends React.Component {
    componentDidMount() {   // retrieves product list during mount
        this.props.setProductList();
    }

    render() {  // renders the list page via map method (loops through the listedProducts array)
        return (
            <div id="products">
                {this.props.listedProducts.map((individualProduct) => {
                    return (
                        <IndividualProduct key={individualProduct._id} obj={individualProduct} func={this.props.changePage} />
                    );
                })}
            </div>
        );
    }
}

// product page component
// OK
class ProductPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            num: 0
        }
        this.handleNumChange = this.handleNumChange.bind(this);
    }

    // retrieves information on current product during mount
    componentDidMount() {
        this.props.setCurrProduct();
    }

    // handles changes in quantity, updates state
    handleNumChange(evt) {
        var val = evt.target.value;
        this.setState({
            num: val
        })
        console.log(val);
    }

    render() {  // rendering
        var details, footer;
        if (this.props.addedStatus === 1) {
            details = 
                <div id="addedWrapper">
                    <p><FaCheckCircle />Added to cart</p>
              </div>
        } else {
            console.log(this.props.currProduct);
            details = 
                <div id="sideOfImg">
                    <div id="prodDetails">
                        <p><b>Product name: </b>{this.props.currProduct.name}</p>
                        <p><b>Price: </b>{this.props.currProduct.price}</p>
                        <p><b>Manufacturer: </b>{this.props.currProduct.manufacturer}</p>
                        <p><b>Description: </b>{this.props.currProduct.description}</p>
                    </div>
                    <div id="qtySelect">
                        <div id="innerQty">
                            <label htmlFor="itemQty">Quantity:</label>
                            <input name="itemQty" type="number" min="0" onChange={this.handleNumChange} />
                            <button className="buttonClicked" id="addToCartBtn"
                                onClick={() => {
                                    if (this.props.loginStatus === 0) {
                                        this.props.changePage(4, this.props.currProduct._id);
                                    }
                                    else {
                                        this.props.addProduct(this.state.num);
                                    }
                                }}>
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
        }

        if (this.props.addedStatus === 1) { // added to cart already
            footer =
                <button id="buttonBelow" onClick={() => {
                    this.props.resetAdded();
                    this.props.changePage(1, -1);
                }}>
                    Continue Browsing<FaChevronRight />
                </button>
        } else {    // not yet added
            footer =
                <button id="buttonBelow" onClick={() => {this.props.changePage(1, -1)}}><FaChevronLeft />Go Back</button>
        }

        return (
            <div>
                <div id="prodSpace">
                    <img src={"http://localhost:3001/" + this.props.currProduct.productImage} className="productImage"
                    height={250} width={250}></img>
                    {details}
                </div>
                <div className="buttonBelowWrap">{footer}</div>
            </div>
        );
    }
}

export default App;