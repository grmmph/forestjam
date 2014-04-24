/*
** Define some global vars 
*/
var ip = window.location.href;
var ipurl = ip.slice(0, (ip.lastIndexOf('/')));
// var ipurl = "http://grmmph.com"; // Toggle this for custom url
var socket = io.connect(ipurl);
var instrumentsList = ['keyboard', 'drums', 'guitar', 'bass']
var login,
    uid,
    color,
    bars = 2, 
    looping = false, 
    $feedback = $('.loop-feedback'),
    noteInfo = {},
    instrument = 'keyboard',
    distortion = false,
    pname = {},
    key = {};

window.addEventListener('load', function() {
    FastClick.attach(document.body);
}, false);

/*
** Here we go 
*/
var Forest = {
  init: function() {
    Forest.isMobile();
  },

  /*
  ** Mobile detection 
  */
  isMobile: function () {
    if($('#ismobile').css('opacity') == 0) {
      window.location.replace("index.html");
    } else {
      Forest.login();
    }
  }, 

  login: function() {
    login = {};
    login.isMobile = true;
    var a = ip.slice((ip.lastIndexOf('?'))+1, ip.length), b;
    if(a.search('http')>=0 || a==''){
      // Manual login
      $('#loginform').submit(function (e) {
        e.preventDefault();
      });
      $('.submit.jamid').click(function (){
        login.sid = $('.text-input.jamid').val();
        socket.emit('login', login)
        $(this).val('Just a sec...').prop('disabled', true).width(95);
      });
    } else {
      // QR based login
      login.sid = a;
      socket.emit('login', login);
      $('.submit.jamid').val('Just a sec...').prop('disabled', true).width(95);
    }

    socket.on('s-msg', function(d){
      $('.submit').on('mousedown', function(){
        $(this).addClass('active')
      }).on('mouseup', function(){
        $(this).removeClass('active')
      });

      if(d == 'login:OK') { 
        $('#login').fadeOut(500)
        setTimeout(function () {Forest.padBoard();}, 500)
        
      } else {
        $('#login').animate({'margin-top': '-=7px'},100, function (){
          $(this).animate({'margin-top': '+=7px'},100, function (){
            $(this).animate({'margin-top': '+=0px'},100)
          })
        })
        $('.invalid').fadeIn('fast')
        $('.text-input').val('')
        $('.submit.jamid').val('JAM!').prop('disabled', false).width(50);
      }
    });

    socket.on('uid', function (p) {
      uid = p.uid;
      color = p.color;
      login.uid = uid;
      key.uid = login.uid,
      instrument = p.instrument;
      $('.instrument').html("<img src='img/thumb/"+instrument+".png'/>")

      if(localStorage.playername != 'undefined'){
        pname.name = localStorage.playername;
        pname.uid = login.uid;
        socket.emit('name', pname)
        $('#player-name').val(pname.name)
      } 
    });
    
  },

  /*
  ** Generate pads Layout and functionality
  */
  padBoard: function() {
    setTimeout(function(){window.scrollTo(0,1)},1000);

    for(var i=1; i<10; i++) {
      $('#pad-holder').append("<a ontouchstart='' class='pad' id='pad-"+i+"' note='"+i+"' instrument='"+key.instrument+"'></a>");
      preventLongPressMenu(document.getElementById("pad-"+i));
    }
    $('.cmp').fadeIn(500);

    // Layout fixes for pads
    $('#pad-holder').width($('body').width());
    $('.pad').height($('.pad').width());
    $('#pad-holder').height($('body').width()-(($('body').width()*0.05)));
    $('.nav-holder').width($('body').width()-75);

    $(window).resize(function () {
      $('#pad-holder').width($('body').width());
      $('.pad').height($('.pad').width());
      $('#pad-holder').height($('body').width()-(($('body').width()*0.05)));
      $('.nav-holder').width($('body').width()-75);
    });

    $('.pad').css("background", color)

    // Pads events
    $('.pad').on('mousedown touchstart', function(){
      key.cmd = 'play';
      key.note = $(this).attr('note');
      key.instrument = instrument;
      if(distortion)
        key.instrument = instrument+"-d";
      socket.emit('key', key)
      $(this).addClass('active')
    });

    //Distortion 
    $('.distortion').click(function(){
      distortion = !distortion;
      if(distortion) {
        $(this).addClass('on');
      } else {
        $(this).removeClass('on');
      };
    });

    // Instrument Navs
    $('.nav.next').click(function () {
      Forest.nextInstru()
    });
    $('.nav.prev').click(function () {
      Forest.prevInstru()
    });

  },

  changeInstru: function (s) {
    $('.instrument').animate({
          'left': 0,
          'opacity' : 0,
        },300,function(){
          $('.instrument').html("<img src='img/thumb/"+instrument+".png'/>");
          $(this).css('left', $(window).width()+100)
            .animate({
              'left': "40%",
              'opacity' : 1,
            },300)
        })
        key.instrument = instrument;
        socket.emit('change', { instrument: instrument, uid: key.uid})
  },

  nextInstru: function () {
    for(var i=0; i <= instrumentsList.length-1; i++) {
      var s = instrumentsList[i].search(instrument);
      if(i==instrumentsList.length-1) {
        instrument = instrumentsList[0];
        Forest.changeInstru(s)
        break;
      }

      if (s>=0) {
        instrument = instrumentsList[i+1];
        Forest.changeInstru(s)
        break;
      }
    }
  },

  prevInstru: function () {
    for(var i=instrumentsList.length-1; i>=0; i--) {
      var s = instrumentsList[i].search(instrument);
      if(i==0) {
        instrument = instrumentsList[instrumentsList.length-1];
        Forest.changeInstru(s);
        break;
      };
         
      if (s>=0) {
        instrument = instrumentsList[i-1];
        Forest.changeInstru(s)
        break;
      };
    }; 
  }

}// End of Forest

$(window).load(function () {
  Forest.init();	
  $('body').fadeIn('fast');
})

/*
** Dirty fix: When session ends, reload the page. 
*/
socket.on('session-end',function (reason) {
  setTimeout(function () {
    location.reload();
  },Math.floor((Math.random()*4)+0)+1000);

  // console.log(reason);
})

socket.on('kick',function (kickUid) {
  if(kickUid == uid) {
    $('.cmp').hide();
    $('#when-kicked').show();
  };
});

/*
** EXTRA FIXES
*/
// Disable the taphold menu on Android
function absorbEvent_(event) {
  var e = event || window.event;
  e.preventDefault && e.preventDefault();
  e.stopPropagation && e.stopPropagation();
  e.cancelBubble = true;
  e.returnValue = false;
  return false;
}
function preventLongPressMenu(node) {
  node.ontouchstart = absorbEvent_;
  node.ontouchmove = absorbEvent_;
  node.ontouchend = absorbEvent_;
  node.ontouchcancel = absorbEvent_;
}