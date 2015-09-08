/**
 * Created by ice3x2 on 2015. 9. 8..
 */

//

function ControlServer(socket) {
    socket.setEncoding('ascii');
    socket.on('data',function(data){
        socket.write('r::s');
    });
    socket.on('end',function(){
        console.log('Client connection ended');
    });
};

module.exports = ControlServer;