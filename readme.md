# Independent Fact Checkers
This is an art project to make a fediverse bot which acts as a fact checker
but uses a neural net to generate relatively random gibberish, both as an
artistic critique of fact checkers in general, and as a playful way to
experience human/AI interaction.

## This Is Misinformation!!!!1

1. This is an AI, it generates gibberish, it is highly unlikely that anyone
is going to consider it anything other than an amusement.
2. "Real" self-proclaimed fact checkers get it wrong often enough that they're
mostly useless. And worse, *they claim to know the truth* so every time they
make a mistake they are misleading people and potentially causing harm. This
bot encourages people to question fact checkers and think critically.
3. chad_yes.png

## How to run it
1. `npm install`
2. copy config.example.js to config.js
3. Register on goose.ai and get a token, place this in gooseAiToken in config.js
4. `node bot.js init` -> this will generate a URL
5. Click the URL from a browser that is logged in to the user which you want to
use as the bot. The webpage will output a token.
6. `node bot.js init <the token from the webpage>` -> it will say "Got teh terkin"
7. `node bot.js` - it's running

## How to use

* Send a fediverse message tagging the bot, and only the bot, which asks a question.
* It will reply with some sillyness.
* Repeat

## Example

https://pkteerium.xyz/@IndependentFactCheckers

## License

AGPLv3