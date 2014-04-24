/*
** Define some global vars 
*/
var ip = window.location.href;
var ipurl = ip.slice(0, (ip.lastIndexOf('/')));
// var ipurl = "http://grmmph.com";
var socket = io.connect(ipurl);
var login, note, ani = {}, assets = [], scaleAnimal;

/*
** Here we go 
*/
var Forest = {
  init: function () {
    Forest.isMobile();
  },
  
  /*
  ** Mobile detection 
  */
  isMobile: function () {
    if($('#ismobile').css('opacity') != 0) {
      window.location.replace("mobile.html");
    }

    // Preload stuff
    for(var i=1; i<10; i++) {
      assets.push('sounds/keyboard/'+i+'.mp3');
      assets.push('sounds/keyboard-d/'+i+'.mp3');
      assets.push('sounds/drums/'+i+'.mp3');
      assets.push('sounds/drums-d/'+i+'.mp3');
      assets.push('sounds/guitar/'+i+'.mp3');
    }

    assets.push('img/sprites/keyboard.png');
    assets.push('img/sprites/drums.png');
    assets.push('img/sprites/guitar.png');
    assets.push('img/sprites/bass.png');

    for(var j=0; j<assets.length; j++) {
      load(assets[j])
      if(j==assets.length-1) {
        Forest.login();
      };
    };

    function load(s) {
      $.ajax({
        url: s
      });
    };
  },

  login: function () {
    socket.on('s-msg', function (a) {
    });
    login = {};

    function makeid() {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < 5; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    };
    
    if(typeof localStorage.sid === 'undefined') {
      login.sid = makeid();
      localStorage.sid = login.sid;
    } else {
      login.sid = localStorage.sid;
    };

    login.isMobile = false;

    socket.emit('login', login);
    Forest.makeqr();
  },

  /*
  ** Generate QR Code 
  */
  makeqr: function () {
    var jamAddress = ipurl + "/forestjam/mobile.html?" + login.sid;
    var qrcode = new QRCode(document.getElementById("qrcode"), {
      text: jamAddress,
      width: 128,
      height: 128,
      colorDark : "#C06060",
      colorLight : "white",
    });
    var qrcodebig = new QRCode(document.getElementById("qrcode-big"), {
      text: jamAddress,
      width: 256,
      height: 256,
      colorDark : "#C06060",
      colorLight : "white",
    });

    $('#ip-address-big').html("Scan the code above with your phone's QR code scanner. <br>Or instead, go to <b class='code'>"+ipurl+"/forestjam</b><br> on your mobile browser and type: <b class='code'>" + login.sid+'</b> at the code box.')

    function getAddress() {
      if(ipurl.search("http://") >= 0) {
        return ipurl.slice(7, ipurl.length)
      } else {
        return ipurl
      }
    }
    $('#qr-holder').mouseenter(function(){
      $('#ip-address').animate({
        'height' : 70
      },300)
      .html("Start Forest Jam on your mobile browser and type: <b class='code'>" + login.sid+'</b>')
    }).mouseleave(function(){
      setTimeout(function() {
        $('#ip-address').animate({
          'height' : 17
        },300)
        .html("Or use <a id='show-address'>URL address</a>")
      }, 1500)
    })
  },

  /*
  ** Calls when user logs in, setting the animal
  */
  setPlayer: function(p) {
    $('#splash').fadeOut('fast');
    $('#stage').append("<div class='animal' uid='"+p.uid+"' instrument='"+p.instrument+"'><a class='btn small hide kick'>kick out</a><div class='player-name' uid='"+p.uid+"'></div></div>");
      $(".animal[uid='"+p.uid+"']").append("<div class='floor' style='border-bottom: 20px solid "+p.color+"'></div>")
      Forest.scale('set');
      $(".animal[uid='"+p.uid+"']").css({
        'margin-top' : '-100px',
        "background": "transparent url(../img/sprites/"+p.instrument+".png) no-repeat",
        'background-position-x' : -scaleAnimal*11,
      })
        .animate({'margin-top' : '0', 'opacity' : 1},500, function(){
          $(this).css( 'background-position' , 0)
          $(".animal[uid='"+p.uid+"']").children('.floor').animate({'opacity': 0.8}, 300)
        })

    $('.kick').click(function() {
      var kickUid = $(this).parent('.animal').attr('uid');
      Forest.killPlayer(kickUid)
      socket.emit('kick', kickUid)
    });
    $('.animal').mouseenter(function(){
      $(this).find('.kick').fadeIn('fast');
    }).mouseleave(function() {
      $(this).find('.kick').fadeOut('fast');
    });
    
    $(window).resize(function(){Forest.scale()});
  },

  /*
  ** Layout scaling 
  */
  scale: function (event) {
    var $s = $('#stage').width(),
      windwi = $(window).width(),
      a = $('.animal').length;

      $('#stage').width(a*280)
      scaleAnimal = 250;
      var scaleStage = (windwi / (a*250))*0.6;

      if(scaleStage>1){
        scaleStage = 1;
      }
      if($s >= windwi*0.7) {
        var marg = (a*250)*0.6 / windwi;
        $('#stage').css('margin-left', - (marg*300))
      } else {
        $('#stage').css('margin-left', 'auto')
      };
      $('#stage').css("-webkit-transform", "scale("+scaleStage+")");
  },

  killPlayer: function (uid) {
    $(".animal[uid='"+uid+"']").fadeOut(500, function (){
      $(this).remove(); 
      Forest.scale('kill');
    });
    setTimeout(function (){
      if($('.animal').length == 0) {
        $('#splash').fadeIn('fast')
      }
    },7000);
  },

  /*
  ** Define the note options 
  */
  note: function (key) {
    var inst = key.instrument;
    var n = key.note;

    note = new Howl({
      urls: ["sounds/"+inst+"/"+n+".mp3"],
      sprite: {
        start: [0,1000],
        all: [0,3000],
        ending: [1500, 2500]
      }
    });
  },

  playNote: function (key) {
    Forest.note(key);
    $(".animal[uid="+key.uid+"]").css('background-position-x' , (-scaleAnimal*(parseInt(key.note))));
    note.play('all');
  },

  endNote: function(key) {
    var inst = key.instrument;

    if(inst != 'drums' && inst != 'keyboard-d' && inst != 'drums-d' && inst != 'bass' && inst != 'bass-d')
      note.fadeOut(0.0, 500);

    $(".animal[uid="+key.uid+"]").css('background-position' , 0)
  },

  changeInstrument: function(d) {
    var uid = d.uid, 
        instrument = d.instrument;
   
    $(".animal[uid="+uid+"]").css('background-position-x' , -scaleAnimal*10)
      .animate({
        'background-position-y' : 250,
        // 'opacity'               : 0
      }, 400, function(){
        $(this).css({
          "background-image": "url(../img/sprites/"+instrument+".png)",
          'background-position-x' : -scaleAnimal*11,
        })
        .animate({
          'background-position-y' : 0,
        },400, function(){
          $(this).css( 'background-position' , 0)
        });
      })
  }

}; // Forest End

// ------------------------- //
socket.on('key', function(key){
  var cmd =  key.cmd;
  n = note;
  if(cmd=='play') Forest.playNote(key);
  if(cmd=='stop') Forest.endNote(key);   
});

socket.on('new-player',function (player) {
  setTimeout(function() {
    Forest.setPlayer(player)
  },500)
});

/*
** For debugging purposes only at the moment. 
*/
// socket.on('cur-players',function (clients) {
//   console.log("clients:");
//   console.log(clients);
// })

socket.on('dis-player',function (player) {
  Forest.killPlayer(player.uid)
});

socket.on('name',function (n) {
  $(".player-name[uid='"+n.uid+"']").html(n.name)
});

socket.on('change',function (d) {
  if(d.instrument != 'undefined') 
    Forest.changeInstrument(d)
});

$(window).load(function () {
  Forest.init();
});
