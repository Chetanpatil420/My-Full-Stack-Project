require('dotenv').config();
const express = require("express");
const app = express()
const mongoose = require("mongoose")
const Listing = require('./Models/listing.js')
const path = require("path");
const methodOverride = require("method-override")
const ejsMate = require("ejs-mate");
const ExpressError = ("./util/ExpressErrror.js");
const Review = require('./Models/review.js')
const session= require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const localStrategy = require("passport-local");
const User = require("./Models/user.js");
const userroute = require("./routes/user.js");
const {isLoggedIn,isOwner,isReviewAuthor} = require("./middleware.js");
const {saveRedirectUrl} = require("./middleware.js");



app.use(express.static("public")); 
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.set("view engine", "ejs")
app.set("views",path.join(__dirname,"views"));
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));


//database connection
// const mongoUrl = "mongodb://127.0.0.1:27017/wanderlust";
// const dbUrl =process.env.ATLASDBURL; 
const dbUrl = 'mongodb+srv://cp7385403833:WWy4OpMEugiQgpwG@cluster0.7ejppx6.mongodb.net/wanderlust?retryWrites=true&w=majority&tls=true';


console.log(dbUrl);

main().then((dbUrl)=>{
    console.log("connection succssesful");
  

})
main().catch(err => console.log(err));


async function main() {
  await mongoose.connect(dbUrl);
        
}



const store =  MongoStore.create({
    mongoUrl:dbUrl,
    crypto: {
        secret: "mysupersecretcode",
    },
     touchAfter : 24 * 3600,
});

store.on("error", () => {
    console.log("Error",error);
});

const sessionOption = {
    store,
    secret : "mysupersecretcode",
    resave: false,
    saveUnintialized: true,
   
    cookie:{
            expires : Date.now() + 7 * 24 * 60 * 60 * 1000,
            maxAge:  7 * 24 * 60  * 60 *  1000,
            httpOnly: true,
     }
};



app.use(session(sessionOption));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next) =>{
    res.locals.success = req.flash("success");
     res.locals.error = req.flash("error");
     res.locals.currUser = req.user;
    next();
});;

// app.get("/demouser",async(req,res) =>{
//     let fakeUser = new user ({
//         email : "chet@gmail.com",
//         username : "deetai-student"
//     });
//     let registeredUser = await user.register(fakeUser, "hello");
//     res.send(registeredUser);
// })


//signup
app.get("/signup",(req,res) =>{
    res.render("listings/users/signup.ejs");
});

app.post("/signup", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const newUser = new User({ email, username });
        const registeredUser = await User.register(newUser, password);
        console.log(registeredUser);
        req.login(registeredUser, (err) =>{
            if(err) {
                return next(err);
            }
            req.flash("success","welcome to wanderlust");
            res.redirect("/listings");
        })
        
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
});


//login.
app.get("/login",
    (req,res) =>{
    res.render("listings/users/login.ejs")
    // res.redirect("/listings");
})


app.post("/login",
    saveRedirectUrl,
    passport.authenticate("local", {
  failureRedirect: '/login',
  failureFlash: true,
    }),
        async(req,res) =>{
        const redirectUrl = res.locals.redirectUrl  || "listings";
        res.redirect(redirectUrl);
})

app.get("/logout", (req,res,next) =>{
    req.logout((err)=>{
        if(err){
           return next(err);
        }
        req.flash("success","you are logged out");
        res.redirect("/listings");
    })
})




// //database connection
// // const mongoUrl = "mongodb://127.0.0.1:27017/wanderlust";
// const dbUrl =process.env.ATLASDBURL; 
// console.log(dbUrl);

// main().then((dbUrl)=>{
//     console.log("connection succssesful");

// })
// main().catch(err => console.log(err));

// // async function main() {
// //     await mongoose.connect(dbUrl)
// // }

// async function main() {
//   await mongoose.connect(dbUrl);
// }


app.get("/", (req,res) => {
    res.redirect("/listings");
})


//index route
app.get("/listings", async(req,res) =>{

  const allListings = await Listing.find({});
   res.render("listings/index.ejs", { allListings });
    //  console.log(allListings);
})


//new rote
app.get("/listings/new",isLoggedIn, (req, res) => {
    //     console.log(req.user);
    //      if(!req.isAuthenticated()){
    //     req.flash("error", "youmust be logged in to create listings")
    //     return res.redirect("/login");
    //  }
       res.render("listings/new.ejs") ;
});


//show route
app.get("/listings/:id", async(req,res) =>{
    try{
    const { id } = req.params;
    const listing = await Listing.findById(id)
    .populate({path : "reviews",
     populate:{path:"author"},
    })
    .populate("owner");
    if(!listing) {
        req.flash("error", "Listing Does not exist");
        res.redirect("/listings");
    }
    res.render("listings/show.ejs",{ listing });
    console.log(listing);
    } catch(err){
         console.log(err);
    }
    
});


//create Route
app.post("/listings", isLoggedIn,async(req,res,next) =>{
    try 
    {
    let {title,description,image,price,country,location} = req.body;
    let newListing = new Listing({
        title : title,
        description : description,
         image: {
         url: req.body.image,
           },
        price : price,
        country : country,
        location : location,

    })
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New Listing Created");
    res.redirect("/listings");
    } catch(err){
        next(err);
    }
});


//edit route
app.get("/listings/:id/edit", isLoggedIn,isOwner,async(req,res)=>{
    try{
    const { id } = req.params;
    const listing = await Listing.findById(id);
    res.render("listings/edit.ejs", { listing });
    } catch(err){
         next(err);
    }
})


//update Route
app.put("/listings/:id",isLoggedIn,isOwner, async (req, res,next) => {
    try{
   let { id } = req.params;
  let listing = await Listing.findById(id);
//   if(!listing.owner._id.equals(res.locals.currUser._id)){
//     req.flash("error", "You dont have permission to edit");
//       res.redirect(`/listings/${id}`);
//   }

  const updatedListing = {
    ...req.body,
    image: {
      url: req.body.image
    }
  };

  await Listing.findByIdAndUpdate(id, updatedListing);
    req.flash("success", "Listing Updated");
   res.redirect("/listings");
  }  catch(err){
      next(err);
}
});

//Delete Route
app.delete("/listings/:id", isLoggedIn,async(req,res)=>{
    try{
         let {id} = req.params;
    let deleted = await Listing.findByIdAndDelete(id);
     req.flash("success", "Listing Deleted");
     res.redirect("/listings");
    } catch(err){
     next(err);
    }
})

//Reviews
app.post("/listings/:id/reviews",isLoggedIn,
    async(req,res) =>{
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review)
    newReview.author = req.user._id;
    console.log(newReview);
    listing.reviews.push(newReview);

    await newReview.save();
    await listing.save();
  
  req.flash("success", "New Review Created");
  res.redirect(`/listings/${listing._id}`);

});

//delete review route
app.delete("/listings/:id/reviews/:reviewId",isLoggedIn, isReviewAuthor,async(req,res)=>{
    let{id,reviewId} = req.params;
    Listing.findByIdAndUpdate(id,{pull: {reviews :reviewId}})
    await Review.findByIdAndDelete(reviewId); 
    req.flash("success", "Review Deleted");
    res.redirect(`/listings/${id}`)
})




// app.get("/testListing", async(req,res)=>{
//     let sampleListing = new Listing ({
//         title : "My New Villa",
//         description : "By the Beach",
//         price : 1200,
//         location :"cailangute ,Goa",
//         country : "India",
//     });

//     await sampleListing.save();
//     console.log("Sample was saved");
//     res.send("Successful");
// });

// app.all("*", (req, res, next) => {
//     if (!req.body.listing) {
//         return next(new ExpressError(400, "Listing data is missing"));
//     }
//     next(new ExpressError(404, "Page Not Found"));
// });

// // general error handler (ALWAYS outside of routes)
// app.use((err, req, res, next) => {
//     const { statusCode = 500, message = "Something went wrong" } = err;
//     res.status(statusCode).send(message);
// });


// async function run() {
//   try {
//     await mongoose.connect(process.env.ATLASDBURL);
//     console.log("✅ Connected to MongoDB");

//     const collections = await mongoose.connection.db.allListingsListing().toArray();
//     console.log("Collections:", collections.map(c => c.name));
//     process.exit(0);
//   } catch (err) {
//     console.error("❌ Error connecting:", err);
//     process.exit(1);
//   }
// }

// run();

app.listen(8080, ()=>{
    console.log("Server is Listening to port 8080");
})
//passsport is a express compatiable authentication middleware of npm