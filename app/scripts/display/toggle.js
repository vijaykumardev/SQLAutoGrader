$(document).ready(function(){
    //hide all divecontainers
    $('#collapsible-panels div').hide()
    // append click event to the a element
    $('#collapsible-panels h4 a').click(function(e){
        e.preventDefault()
        //slide down the corresponding div if hidden, or slide up if shown
        $(this).parent().next('#collapsible-panels div').slideToggle('slow');
        //set the current item as active
        //$(this).parent().toggleClass('active')
    })
})