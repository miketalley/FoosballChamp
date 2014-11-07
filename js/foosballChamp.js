function FoosballChampViewModel(){
	var self = this,
		fb;

	// #####  Observable constants  #####
	self.states = ko.observableArray(["AK","AL","AR","AS","AZ","CA","CO","CT","DC","DE","FL","GA",
		"GU","HI","IA","ID","IL","IN","KS","KY","LA","MA","MD","ME","MH","MI","MN","MO","MS","MT",
		"NC","ND","NE","NH","NJ","NM","NV","NY","OH","OK","OR","PA","PR","PW","RI","SC","SD","TN",
		"TX","UT","VA","VI","VT","WA","WI","WV","WY"]);
	self.numPlayerOptions = ko.observableArray([2, 4, 8]);
	self.scorePossibilities = ko.observableArray([0,1,2,3,4,5,6,7,8,9,10]);

	// #####  Player variables  #####
	self.players = ko.observableArray();
	self.alphabeticalPlayers = ko.computed(function(){
		return self.players.sort(function(playera, playerb){
			return playera.lastName == playerb.lastName ? (playera.firstName == playerb.firstName ? 0 : (playera.firstName < playerb.firstName ? -1 : 1)) : (playera.lastName < playerb.lastName ? -1 : 1);
		});
	});
	self.rankedPlayers = ko.computed(function(){
		return self.players().sort(function(playera, playerb){
			return rankingScore(playera) === rankingScore(playerb) ? 0 : (rankingScore(playera) < rankingScore(playerb) ? 1 : -1);
			
			function rankingScore(player){
				return (player.wins * 2) + (player.wins + player.losses);
			};
		});
	});
	self.playerFirstName = ko.observable();
	self.playerLastName = ko.observable();
	self.playerCity = ko.observable();
	self.playerState = ko.observable();

	// #####  Game variables  #####
	self.games = ko.observableArray();
	self.numPlayers = ko.observable();

	self.playerA1 = ko.observable();
	self.playerA2 = ko.observable();
	self.playerA3 = ko.observable();
	self.playerA4 = ko.observable();
	self.playerB1 = ko.observable();
	self.playerB2 = ko.observable();
	self.playerB3 = ko.observable();
	self.playerB4 = ko.observable();

	self.teamA = ko.computed(function(){
		if(self.numPlayers() === 2){
			return [self.playerA1()];
		}
		else if(self.numPlayers() === 4){
			return [self.playerA1(), self.playerA2()];
		}
		else if(self.numPlayers() === 8){
			return [self.playerA1(), self.playerA2(), self.playerA3(), self.playerA4()];
		}
	});

	self.teamB = ko.computed(function(){
		if(self.numPlayers() === 2){
			return [self.playerB1()];
		}
		else if(self.numPlayers() === 4){
			return [self.playerB1(), self.playerB2()];
		}
		else if(self.numPlayers() === 8){
			return [self.playerB1(), self.playerB2(), self.playerB3(), self.playerB4()];
		}
	});

	self.teamAScore = ko.observable();
	self.teamBScore = ko.observable();
	self.gameDateTime = ko.observable();
	self.gameLocation = ko.observable();

	self.currentTemplate = ko.observable('home');
	setupFirebase();

	self.changeTemplate = function(newTemplate){
		self.currentTemplate(newTemplate);
	};

	self.addNewPlayer = function(){
		var newPlayer = {
			firstName: self.playerFirstName(),
			lastName: self.playerLastName(),
			city: self.playerCity(),
			state: self.playerState(),
			wins: 0,
			losses: 0
		};

		self.players.push(newPlayer);
		statusMessage("Player Saved!");
	};

	self.addNewGame = function(){
		var newGame = {
			teamA: {
				players: self.teamA(),
				score: self.teamAScore()
			},
			teamB: {
				players: self.teamB(),
				score: self.teamBScore()
			},
			dateTime: self.gameDateTime(),
			location: self.gameLocation()
		};

		// Add wins and losses to corresponding players
		if(self.teamAScore() > self.teamBScore()){
			addWin(self.teamA());
			addLoss(self.teamB());
			addGame(newGame);
		}
		else if(self.teamBScore() > self.teamAScore()){
			addWin(self.teamB());
			addLoss(self.teamA());
			addGame(newGame);
		}
		else{
			statusMessage('Game cannot end in a tie!');
		}
	};

	function addWin(team){
		$.each(team, function(i, player){
			if(player){
				player.wins += 1;
				updatePlayer(player);
			}
		});
	};

	function addLoss(team){
		$.each(team, function(i, player){
			if(player){
				player.losses += 1;
				updatePlayer(player);
			}
		});
	};

	function updatePlayer(player){
		var playerIndex = self.players.indexOf(player);
		
		self.players.splice(playerIndex, 1);
		self.players.push(player);
		saveFirebase();
	};

	function addGame(game){
		self.games.push(game);
		self.teamAScore(null);
		self.teamBScore(null);
		self.numPlayers(null);
		statusMessage("Game Saved!");
		saveFirebase();
	};

	function statusMessage(text){
		$("#status-message").text(text);
		setTimeout(function(){
			$("#status-message").text("");
		}, 1000);
	};

	function setupFirebase(){
		fb = new Firebase('https://blistering-fire-3558.firebaseio.com/');
		fb.on("value", function(response){
			var fbData = response.val();
			self.games(fbData.games);
			self.players(fbData.players);
		});
	};

	function saveFirebase(){
		fb.set({
			games: self.games(),
			players: self.players()
		});
	};
}

$(document).ready(function(){
	ko.applyBindings(new FoosballChampViewModel());
});