import 'dotenv/config';
import Discord, { TextChannel } from 'discord.js';
import fetch from 'node-fetch';
import { ethers } from "ethers";
import { parseISO } from 'date-fns'


const discordBot = new Discord.Client();
const  discordSetup = async (): Promise<TextChannel> => {
  return new Promise<TextChannel>((resolve, reject) => {
    ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'].forEach((envVar) => {
      if (!process.env[envVar]) reject(`${envVar} not set`)
    })

    discordBot.login(process.env.DISCORD_BOT_TOKEN);
    discordBot.on('ready', async () => {
      const channel = await discordBot.channels.fetch(process.env.DISCORD_CHANNEL_ID!);
      resolve(channel as TextChannel);
    });
    
  })
}

const buildMessage = (sale: any) => (
  new Discord.MessageEmbed()
	.setColor('#8CFF9B')
	.setTitle('OctoHedz #'+Number.parseInt(sale.asset.token_id) + ' @' + `${ethers.utils.formatEther(sale.total_price)}${ethers.constants.EtherSymbol}`)
	.setURL(sale.asset.permalink)
	.setThumbnail(sale.asset.image_url)
	.addFields(
		{ name: 'Buyer', value: '['+sale?.winner_account?.user.username+'](https://opensea.io/'+sale?.winner_account?.user.username+')', },
	)
  
	.setTimestamp(sale.created_date) // unclear why this seems broken
	.setFooter('Sold on OpenSea')
)

async function main() {
  const channel = await discordSetup();
  const seconds = process.env.SECONDS ? parseInt(process.env.SECONDS) : 2_000;
  const hoursAgo = (Math.round(new Date().getTime() / 1000) - (seconds)); // in the last hour, run hourly?
  
  const openSeaResponse = await fetch(
    "https://api.opensea.io/api/v1/events?" + new URLSearchParams({
      offset: '0',
      limit: '100',
      event_type: 'successful',
      only_opensea: 'true',
      occurred_after: hoursAgo.toString(), 
      collection_slug: process.env.COLLECTION_SLUG!,
  })).then((resp) => resp.json());
  

  await Promise.all(
    openSeaResponse?.asset_events?.map(async (sale: any) => {
      sale.asset.token_id=Number.parseInt(sale.asset.token_id)+1;
      if (sale.winner_account.user.username==null) {
         sale.winner_account.user.username=sale.winner_account.address;
      }

      
      const message = buildMessage(sale);
      //console.log(sale);
      return channel.send(message)
    })
  );   
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
