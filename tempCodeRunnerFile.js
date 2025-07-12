app.get("/listings", async(req,res) =>{

  const allListings = await Listing.find({});
     if(!req.isAuthenticated()){
        req.flash("error", "youmust be logged in to create listings")
        return res.redirect("/listings");
     }
   res.render("listings/index.ejs", { allListings });
    //  console.log(allListings);
})
