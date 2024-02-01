import { Assets, Container } from '../PIXI';

export const gifs = async (parent: Container) => {
	const image = await Assets.load('jake.gif');
	image.width = 64;
	image.height = 32;

	const image2 = await Assets.load(
		'https://media4.giphy.com/media/wosNsGaxczbIA/giphy.gif?cid=ecf05e47c0ykhynrsz1kbos9yq6ipn71t3nbmq7s1cdjnv7a&rid=giphy.gif&ct=g'
	);
	image2.width = 64;
	image2.height = 32;
	image2.position.x = 64;

	parent.addChild(image, image2);

	return {
		update: (dt: number) => {},
		destroy: async (dt: number) => {}
	};
};
