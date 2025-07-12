const Listing = require("./Models/listing")
const Review = require("./Models/review")

module.exports.isLoggedIn=(req,res,next) =>{
        console.log(req.user);
        if(!req.isAuthenticated()){
        req.session.redirectUrl = req.orignalUrl;
        req.flash("error", "youmust be logged in to create listings")
        return res.redirect("/login");
     }
      next();
}


module.exports.saveRedirectUrl = (req,res,next) => {
      if(req.session.redirectUrl){
            res.locals.redirectUrl = req.session.redirectUrl;
      }
      next();
}

module.exports.isOwner =async (req,res,next)=>{
    
   let { id } = req.params;
  let listing = await Listing.findById(id);
  if(!listing.owner._id.equals(res.locals.currUser._id)){
    req.flash("error", "You dont have permission to edit");
      res.redirect(`/listings/${id}`);
  }
       next();
};

 module.exports.isReviewAuthor =async (req,res,next)=>{
    
   let {id, reviewId } = req.params;
  let review = await Review.findById(reviewId);
  if(!review.author.equals(res.locals.currUser._id)){
    req.flash("error", "You dont have permission to edit or delet review");
       res.redirect(`/listings/${id}`);
    
  }
       next();
};     










