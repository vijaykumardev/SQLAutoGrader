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
    var $preAssign = $('#selected-assignment').attr('pre-value');
    var $preQuest = $("#selected-question").attr('pre-value');
      $("#assignment-dropdown").val($preAssign);
      $(".questions-dropdown").hide();
      $( "#question-dropdown-"+$preAssign ).show();
      $( "#question-dropdown-"+$preAssign ).val($preQuest);
      $("#selected-question").text("Question "+(Number($preQuest)+1));
      $("#selected-assignment").text("Assignment "+(Number($preAssign)+1));
      $(".questions").hide();
      $( "#assignment-"+Number($preAssign)+"-question-"+Number($preQuest) ).show();
})